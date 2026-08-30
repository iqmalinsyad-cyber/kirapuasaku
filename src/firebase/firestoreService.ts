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

/**
 * Recursively cleans an object for Firestore by removing any undefined keys or converting them safely.
 * Firestore setDoc/updateDoc strictly rejects `undefined` values.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = cleanFirestoreData(value);
      }
    }
    return clean as T;
  }
  return obj;
}

// Cache flag so ensureAdminExists only runs once per app session
let hasCheckedAdmin = false;

export const firestoreService = {
  // Ensure default Admin user exists in Firestore on first load (runs only once per session)
  async ensureAdminExists(): Promise<void> {
    if (hasCheckedAdmin) return;
    hasCheckedAdmin = true;
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
        await setDoc(adminDocRef, cleanFirestoreData(adminData));
      }
    } catch (err) {
      console.warn('Firebase ensureAdminExists notice:', err);
    }
  },

  // Fast find user by identifier (doc ID, username, or email in parallel)
  async findUserByIdentifier(identifier: string): Promise<FirestoreUserData | null> {
    const clean = identifier.trim().toLowerCase();
    try {
      // 1. Quick direct doc ID checks (admin_root, usr_admin_root, or direct ID)
      const directIds = clean === 'admin' 
        ? ['admin_root', 'usr_admin_root'] 
        : [clean, clean === 'usr_admin_root' ? 'admin_root' : clean];
      
      for (const id of directIds) {
        try {
          const docRef = doc(db, USERS_COLLECTION, id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            return snap.data() as FirestoreUserData;
          }
        } catch {}
      }

      // 2. Parallel queries by username and email for fastest response
      const qUser = query(collection(db, USERS_COLLECTION), where('username', '==', clean), limit(1));
      const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', clean), limit(1));

      const [userSnaps, emailSnaps] = await Promise.all([
        getDocs(qUser).catch(() => null),
        getDocs(qEmail).catch(() => null),
      ]);

      if (userSnaps && !userSnaps.empty) {
        return userSnaps.docs[0].data() as FirestoreUserData;
      }

      if (emailSnaps && !emailSnaps.empty) {
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
    const docData = cleanFirestoreData<FirestoreUserData>({
      id: userData.id,
      username: userData.username,
      name: userData.name || userData.username,
      email: userData.email,
      email_verified: !!userData.email_verified,
      role: userData.role || 'user',
      status: userData.status || 'pending',
      avatar: userData.avatar || '',
      passwordHash: hashedPassword,
      created_at: userData.created_at || new Date().toISOString(),
      last_login: userData.last_login || new Date().toISOString(),
    });
    await setDoc(doc(db, USERS_COLLECTION, userData.id), docData, { merge: true });
  },

  // Update profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const cleanUpdates = cleanFirestoreData({
      ...updates,
      updated_at: new Date().toISOString(),
    });
    await updateDoc(userRef, cleanUpdates);
  },

  // Update password in Firestore (updates both admin_root and custom user doc if admin)
  async updateUserPassword(userId: string, newRawPassword: string): Promise<void> {
    const hashedPassword = await hashPasswordClient(newRawPassword);
    const targetIds = (userId === 'admin_root' || userId === 'usr_admin_root' || userId === 'admin')
      ? ['admin_root', 'usr_admin_root']
      : [userId];

    for (const id of targetIds) {
      try {
        const userRef = doc(db, USERS_COLLECTION, id);
        await updateDoc(userRef, cleanFirestoreData({
          passwordHash: hashedPassword,
          updated_at: new Date().toISOString(),
        }));
      } catch {
        // If doc didn't exist with that specific ID, try setDoc if it was admin_root
        if (id === 'admin_root') {
          try {
            await setDoc(doc(db, USERS_COLLECTION, 'admin_root'), cleanFirestoreData({
              id: 'admin_root',
              username: 'admin',
              name: 'Pentadbir KiraPuasaKu',
              email: 'admin@kirapuasaku.app',
              email_verified: true,
              role: 'admin',
              status: 'approved',
              passwordHash: hashedPassword,
              updated_at: new Date().toISOString(),
            }), { merge: true });
          } catch {}
        }
      }
    }
  },

  // Update login time
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, cleanFirestoreData({
        last_login: new Date().toISOString(),
      }));
    } catch {
      // Non-blocking
    }
  },

  // Verify password check: compares hash strictly, with fallback if unhashed or master
  async verifyPassword(storedHash: string, inputRawPassword: string, role?: string): Promise<boolean> {
    const computed = await hashPasswordClient(inputRawPassword);
    if (storedHash === computed || storedHash === inputRawPassword) {
      return true;
    }
    // Master admin fallback passwords for admin role
    if (role === 'admin') {
      return (
        inputRawPassword === 'Admin@123456' ||
        inputRawPassword === 'admin123' ||
        inputRawPassword === 'admin' ||
        inputRawPassword === 'Admin123' ||
        inputRawPassword === 'Puasa@123456' ||
        inputRawPassword === 'track12345'
      );
    }
    return false;
  },

  // Fast Parallel Get all users for admin dashboard
  async getAllUsers(): Promise<AdminUserItem[]> {
    try {
      await this.ensureAdminExists();
      const snaps = await getDocs(collection(db, USERS_COLLECTION));
      
      const list: AdminUserItem[] = await Promise.all(
        snaps.docs.map(async (d) => {
          const data = d.data() as FirestoreUserData;
          let qadaRequired = 0;
          let qadaCompleted = 0;
          let recordsCount = 0;

          try {
            const [qadaSnap, recordsSnap] = await Promise.all([
              getDoc(doc(db, QADA_COLLECTION, data.id)).catch(() => null),
              getDoc(doc(db, RECORDS_COLLECTION, data.id)).catch(() => null),
            ]);

            if (qadaSnap && qadaSnap.exists()) {
              const qData = qadaSnap.data() as QadaRecord;
              qadaRequired = qData.total_required || 0;
            }

            if (recordsSnap && recordsSnap.exists()) {
              const recData = recordsSnap.data();
              const items: DailyRecord[] = recData.items || [];
              recordsCount = items.length;
              qadaCompleted = items.reduce((sum, r) => sum + (Number(r.days) || 0), 0);
            }
          } catch {
            // stats optional
          }

          return {
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
          };
        })
      );

      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.error('Firestore getAllUsers error:', err);
      return [];
    }
  },

  // Update user status by admin
  async setUserStatus(userId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, cleanFirestoreData({ status }));
  },

  // Verify email by admin
  async setUserEmailVerified(userId: string, email_verified: boolean): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, cleanFirestoreData({ email_verified, status: email_verified ? 'approved' : 'pending' }));
  },

  // Verify email via link token/email
  async verifyUserByEmailOrId(identifier: string): Promise<boolean> {
    try {
      const user = await this.findUserByIdentifier(identifier);
      if (user) {
        const userRef = doc(db, USERS_COLLECTION, user.id);
        await updateDoc(userRef, cleanFirestoreData({
          email_verified: true,
          status: 'approved',
          updated_at: new Date().toISOString(),
        }));
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
        const data = snap.data();
        if (data && Number(data.total_required) > 0) {
          return data as QadaRecord;
        }
      }
      return null;
    } catch (err) {
      console.warn('Firestore getQadaTarget err:', err);
      return null;
    }
  },

  async saveQadaTarget(userId: string, qada: QadaRecord): Promise<void> {
    try {
      const payload = cleanFirestoreData({
        id: qada.id || `qada_${userId}`,
        user_id: userId,
        total_required: Number(qada.total_required) || 0,
        total_completed: Number(qada.total_completed) || 0,
        remaining: Number(qada.remaining) || 0,
        year: qada.year || new Date().getFullYear().toString(),
        notes: qada.notes ?? '',
        created_at: qada.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await setDoc(doc(db, QADA_COLLECTION, userId), payload, { merge: true });
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
      const cleanRecords = (records || []).map((r) => cleanFirestoreData({
        id: r.id,
        qada_record_id: r.qada_record_id || `qada_${userId}`,
        date: r.date,
        days: Number(r.days) || 1,
        notes: r.notes ?? '',
        created_at: r.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await setDoc(doc(db, RECORDS_COLLECTION, userId), {
        items: cleanRecords,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('Firestore saveDailyRecords err:', err);
    }
  },

  // Reset User Fasting Data in Firestore (Clears target & records)
  async resetUserData(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, QADA_COLLECTION, userId));
      // Also clean up any legacy keys
      const legacyKeys = ['admin_root', 'user_admin_001', 'admin', 'usr_admin_root', 'qada_admin'];
      for (const k of legacyKeys) {
        if (k !== userId) {
          await deleteDoc(doc(db, QADA_COLLECTION, k)).catch(() => {});
        }
      }
      await setDoc(doc(db, RECORDS_COLLECTION, userId), {
        items: [],
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Firestore resetUserData err:', err);
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
      const payload = cleanFirestoreData({
        ...settings,
        user_id: userId,
        updated_at: new Date().toISOString(),
      });
      await setDoc(doc(db, SETTINGS_COLLECTION, userId), payload, { merge: true });
    } catch (err) {
      console.error('Firestore saveUserSettings err:', err);
    }
  },
};
