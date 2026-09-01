import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile, 
  reload,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { auth, db } from './config';
import { firestoreService, FirestoreUserData } from './firestoreService';
import { User } from '../types';

export interface FirebaseRegisterResult {
  success: boolean;
  user?: User;
  firebaseUser?: FirebaseUser;
  emailSent?: boolean;
  error?: string;
  code?: string;
}

export const firebaseAuthService = {
  /**
   * Register a new user using Firebase Authentication + Firestore Database Sync.
   */
  async registerNewUser(
    username: string,
    email: string,
    password: string,
    avatar?: string,
    name?: string
  ): Promise<FirebaseRegisterResult> {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name && name.trim()) || cleanUsername;
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    try {
      // 1. Check if user with same username or email already exists in Firestore
      await firestoreService.ensureAdminExists();
      const existingUser = await firestoreService.findUserByIdentifier(cleanUsername) ||
                           await firestoreService.findUserByIdentifier(cleanEmail);

      if (existingUser) {
        if (existingUser.username.toLowerCase() === cleanUsername) {
          return {
            success: false,
            error: 'Nama pengguna (username) ini telah didaftarkan. Sila guna username lain.',
            code: 'USERNAME_EXISTS'
          };
        }
        return {
          success: false,
          error: 'Alamat emel ini telah didaftarkan. Sila log masuk atau gunakan emel lain.',
          code: 'EMAIL_EXISTS'
        };
      }

      let userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      let firebaseUser: FirebaseUser | undefined = undefined;
      let emailSent = false;
      let emailVerified = false;

      // 2. Attempt Firebase Authentication Registration
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = userCredential.user;
        userId = firebaseUser.uid; // Use Firebase UID for perfect Auth-Firestore pairing

        // Update profile in Firebase Auth
        await updateProfile(firebaseUser, {
          displayName,
          photoURL: defaultAvatar,
        });

        // Send official Firebase Verification Email
        try {
          await sendEmailVerification(firebaseUser);
          emailSent = true;
        } catch (mailErr: any) {
          console.warn('Firebase sendEmailVerification notice:', mailErr);
        }

        emailVerified = firebaseUser.emailVerified;
      } catch (authErr: any) {
        console.warn('Firebase Auth create user fallback to Firestore:', authErr.code, authErr.message);
        
        if (authErr.code === 'auth/email-already-in-use') {
          return {
            success: false,
            error: 'Alamat emel ini telah didaftarkan dalam Firebase. Sila log masuk atau gunakan emel lain.',
            code: 'auth/email-already-in-use'
          };
        }
        if (authErr.code === 'auth/weak-password') {
          return {
            success: false,
            error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.',
            code: 'auth/weak-password'
          };
        }
        if (authErr.code === 'auth/invalid-email') {
          return {
            success: false,
            error: 'Format alamat emel tidak sah.',
            code: 'auth/invalid-email'
          };
        }

        // If email/password provider is not enabled in Firebase Console, fallback to Firestore registration
      }

      // 3. Save User Profile in Firestore
      const newUser: User = {
        id: userId,
        username: cleanUsername,
        name: displayName,
        email: cleanEmail,
        email_verified: emailVerified,
        role: 'user',
        status: 'approved',
        avatar: defaultAvatar,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      await firestoreService.registerUser(newUser, password);

      // Send Telegram registration alert if configured
      firestoreService.sendNewUserRegistrationAlertDirect(newUser).catch(() => {});

      return {
        success: true,
        user: newUser,
        firebaseUser,
        emailSent,
      };
    } catch (err: any) {
      console.error('firebaseAuthService.registerNewUser error:', err);
      return {
        success: false,
        error: err.message || 'Ralat semasa mendaftar akaun.',
      };
    }
  },

  /**
   * Resend Firebase Email Verification.
   */
  async resendVerificationEmail(): Promise<{ success: boolean; message: string }> {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return {
          success: true,
          message: 'Pautan pengesahan emel Firebase telah dihantar semula ke peti masuk anda.',
        };
      }
      return {
        success: false,
        message: 'Pengguna semasa tidak ditemui. Sila cuba log masuk semula.',
      };
    } catch (err: any) {
      console.warn('resendVerificationEmail error:', err);
      return {
        success: false,
        message: err.message || 'Gagal menghantar emel pengesahan Firebase.',
      };
    }
  },

  /**
   * Check if the current Firebase user's email has been verified.
   */
  async checkEmailVerificationStatus(identifier?: string): Promise<{ verified: boolean; user?: FirestoreUserData | null }> {
    try {
      // 1. Check Firebase Auth user if available
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          // Sync to Firestore
          if (identifier) {
            await firestoreService.verifyUserByEmailOrId(identifier);
          } else {
            await firestoreService.verifyUserByEmailOrId(auth.currentUser.uid);
          }
          const userDoc = await firestoreService.findUserByIdentifier(auth.currentUser.uid);
          return { verified: true, user: userDoc };
        }
      }

      // 2. Check Firestore record directly
      if (identifier) {
        const userDoc = await firestoreService.findUserByIdentifier(identifier);
        if (userDoc && (userDoc.email_verified || userDoc.status === 'approved')) {
          return { verified: true, user: userDoc };
        }
      }

      return { verified: false };
    } catch (err) {
      console.error('checkEmailVerificationStatus error:', err);
      return { verified: false };
    }
  },

  /**
   * Direct verify user in Firestore (Instant verification via Firebase).
   */
  async verifyUserDirectlyInFirestore(identifier: string): Promise<boolean> {
    try {
      const success = await firestoreService.verifyUserByEmailOrId(identifier);
      return success;
    } catch (err) {
      console.error('verifyUserDirectlyInFirestore error:', err);
      return false;
    }
  },

  /**
   * Sign out current user from Firebase Auth
   */
  async signOut(): Promise<void> {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
  }
};
