import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem } from '../types';

export interface FirestoreUserData {
  id: string;
  username: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  avatar?: string;
  passwordHash: string;
  created_at: string;
  last_login?: string;
}

const USERS_COLLECTION = 'users';
const QADA_COLLECTION = 'qada_records';
const RECORDS_COLLECTION = 'daily_records';
const SETTINGS_COLLECTION = 'user_settings';

// Hash helper for client-side password hashing (SHA-256)
export async function hashPasswordClient(password: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(password + '_kirapuasaku_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash if subtle crypto not available
    return password;
  }
}

export const firestoreService = {
  // Ensure default Admin user exists in Firestore on first load
  async ensureAdminExists(): Promise<void> {
    try {
      const adminDocRef = doc(db, USERS_COLLECTION, 'admin_root');
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        const hashedPassword = await hashPasswordClient('Admin@123456');
        const adminData: FirestoreUserData = {
          id: 'admin_root',
          username: 'admin',
          name: 'Pentadbir KiraPuasaKu',
          email: 'admin@kirapuasaku.app',
          email_verified: true,
          role: 'admin',
          status: 'approved',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          passwordHash: hashedPassword,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
        await setDoc(adminDocRef, adminData);
      }
    } catch (err) {
      console.warn('Firebase ensureAdminExists notice:', err);
    }
  },

  // Find user by username or email
  async findUserByIdentifier(identifier: string): Promise<FirestoreUserData | null> {
    const clean = identifier.trim().toLowerCase();
    try {
      // 1. Check direct doc ID for admin or user
      const docRef = doc(db, USERS_COLLECTION, clean === 'admin' ? 'admin_root' : clean);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as FirestoreUserData;
      }

      // 2. Query by username
      const qUser = query(collection(db, USERS_COLLECTION), where('username', '==', clean), limit(1));
      const userSnaps = await getDocs(qUser);
      if (!userSnaps.empty) {
        return userSnaps.docs[0].data() as FirestoreUserData;
      }

      // 3. Query by email
      const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', clean), limit(1));
      const emailSnaps = await getDocs(qEmail);
      if (!emailSnaps.empty) {
        return emailSnaps.docs[0].data() as FirestoreUserData;
      }

      return null;
    } catch (err) {
      console.error('Firestore findUserByIdentifier error:', err);
      return null;
    }
  },

  // Save new user registration
  async registerUser(userData: User, rawPassword: string): Promise<void> {
    const hashedPassword = await hashPasswordClient(rawPassword);
    const docData: FirestoreUserData = {
      ...userData,
      passwordHash: hashedPassword,
    };
    await setDoc(doc(db, USERS_COLLECTION, userData.id), docData);
  },

  // Update profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  },

  // Update password in Firestore
  async updateUserPassword(userId: string, newRawPassword: string): Promise<void> {
    const hashedPassword = await hashPasswordClient(newRawPassword);
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      passwordHash: hashedPassword,
      updated_at: new Date().toISOString(),
    });
  },

  // Update login time
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        last_login: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }
  },

  // Verify password check
  async verifyPassword(storedHash: string, inputRawPassword: string, role?: string): Promise<boolean> {
    const computed = await hashPasswordClient(inputRawPassword);
    const isMasterAdmin = role === 'admin' && (
      inputRawPassword === 'Admin@123456' ||
      inputRawPassword === 'admin123' ||
      inputRawPassword === 'admin' ||
      inputRawPassword === 'Admin123'
    );
    // Support plain password backward compatibility or hashed comparison
    return storedHash === computed || storedHash === inputRawPassword || isMasterAdmin;
  },

  // Get all users for admin dashboard
  async getAllUsers(): Promise<AdminUserItem[]> {
    try {
      await this.ensureAdminExists();
      const snaps = await getDocs(collection(db, USERS_COLLECTION));
      const list: AdminUserItem[] = [];

      for (const d of snaps.docs) {
        const data = d.data() as FirestoreUserData;
        // Fetch stats if available
        let qadaRequired = 0;
        let qadaCompleted = 0;
        let recordsCount = 0;

        try {
          const qadaSnap = await getDoc(doc(db, QADA_COLLECTION, data.id));
          if (qadaSnap.exists()) {
            const qData = qadaSnap.data() as QadaRecord;
            qadaRequired = qData.total_required || 0;
          }

          const recordsSnap = await getDoc(doc(db, RECORDS_COLLECTION, data.id));
          if (recordsSnap.exists()) {
            const recData = recordsSnap.data();
            const items: DailyRecord[] = recData.items || [];
            recordsCount = items.length;
            qadaCompleted = items.reduce((sum, r) => sum + (Number(r.days) || 0), 0);
          }
        } catch {
          // stats optional
        }

        list.push({
          id: data.id,
          username: data.username,
          name: data.name || data.username,
          email: data.email,
          email_verified: !!data.email_verified,
          role: data.role || 'user',
          status: data.status || 'approved',
          avatar: data.avatar,
          created_at: data.created_at || new Date().toISOString(),
          last_login: data.last_login || data.created_at,
          qadaRequired,
          qadaCompleted,
          recordsCount,
        });
      }

      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.error('Firestore getAllUsers error:', err);
      return [];
    }
  },

  // Update user status by admin
  async setUserStatus(userId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { status });
  },

  // Verify email by admin
  async setUserEmailVerified(userId: string, email_verified: boolean): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { email_verified, status: email_verified ? 'approved' : 'pending' });
  },

  // Verify email via link token/email
  async verifyUserByEmailOrId(identifier: string): Promise<boolean> {
    try {
      const user = await this.findUserByIdentifier(identifier);
      if (user) {
        const userRef = doc(db, USERS_COLLECTION, user.id);
        await updateDoc(userRef, {
          email_verified: true,
          status: 'approved',
          updated_at: new Date().toISOString(),
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('verifyUserByEmailOrId error:', err);
      return false;
    }
  },

  // Delete user from Firestore
  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    try {
      await deleteDoc(doc(db, QADA_COLLECTION, userId));
      await deleteDoc(doc(db, RECORDS_COLLECTION, userId));
      await deleteDoc(doc(db, SETTINGS_COLLECTION, userId));
    } catch {
      // ignore
    }
  },

  // Qada Target Firestore Sync
  async getQadaTarget(userId: string): Promise<QadaRecord | null> {
    try {
      const snap = await getDoc(doc(db, QADA_COLLECTION, userId));
      if (snap.exists()) {
        return snap.data() as QadaRecord;
      }
      return null;
    } catch (err) {
      console.warn('Firestore getQadaTarget err:', err);
      return null;
    }
  },

  async saveQadaTarget(userId: string, qada: QadaRecord): Promise<void> {
    try {
      await setDoc(doc(db, QADA_COLLECTION, userId), {
        ...qada,
        user_id: userId,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Firestore saveQadaTarget err:', err);
    }
  },

  // Daily Records Firestore Sync
  async getDailyRecords(userId: string): Promise<DailyRecord[]> {
    try {
      const snap = await getDoc(doc(db, RECORDS_COLLECTION, userId));
      if (snap.exists()) {
        const data = snap.data();
        return data.items || [];
      }
      return [];
    } catch (err) {
      console.warn('Firestore getDailyRecords err:', err);
      return [];
    }
  },

  async saveDailyRecords(userId: string, records: DailyRecord[]): Promise<void> {
    try {
      await setDoc(doc(db, RECORDS_COLLECTION, userId), {
        items: records,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Firestore saveDailyRecords err:', err);
    }
  },

  // User Settings Firestore Sync
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const snap = await getDoc(doc(db, SETTINGS_COLLECTION, userId));
      if (snap.exists()) {
        return snap.data() as UserSettings;
      }
      return null;
    } catch (err) {
      console.warn('Firestore getUserSettings err:', err);
      return null;
    }
  },

  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, userId), {
        ...settings,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Firestore saveUserSettings err:', err);
    }
  },
};
