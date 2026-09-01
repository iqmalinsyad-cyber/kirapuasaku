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
import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem, AccessCodeItem } from '../types';

export interface FirestoreUserData {
  id: string;
  username: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  avatar?: string;
  registration_code?: string;
  registration_code_used?: boolean;
  code_type?: 'registration' | 'access';
  passwordHash: string;
  created_at: string;
  last_login?: string;
}

// Generate unique Registration Code (e.g. REG-8K92X1)
export function generateRegistrationCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'REG-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique Access Code (e.g. ACC-7M419B)
export function generateAccessCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'ACC-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const USERS_COLLECTION = 'users';
const QADA_COLLECTION = 'qada_records';
const RECORDS_COLLECTION = 'daily_records';
const SETTINGS_COLLECTION = 'user_settings';
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
const ACCESS_CODES_COLLECTION = 'access_codes';

export interface TelegramFirestoreConfig {
  botToken?: string;
  adminChatId?: string;
  enabled: boolean;
  updated_at?: string;
}

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
  async registerUser(userData: User, rawPassword: string, customCode?: string): Promise<string> {
    const hashedPassword = await hashPasswordClient(rawPassword);
    const code = customCode || userData.registration_code || generateRegistrationCode();
    const docData = cleanFirestoreData<FirestoreUserData>({
      id: userData.id,
      username: userData.username,
      name: userData.name || userData.username,
      email: userData.email,
      email_verified: !!userData.email_verified,
      role: userData.role || 'user',
      status: userData.status || 'pending',
      avatar: userData.avatar || '',
      registration_code: code,
      registration_code_used: false,
      code_type: 'registration',
      passwordHash: hashedPassword,
      created_at: userData.created_at || new Date().toISOString(),
      last_login: userData.last_login || new Date().toISOString(),
    });
    await setDoc(doc(db, USERS_COLLECTION, userData.id), docData, { merge: true });
    return code;
  },

  // Update User Registration / Verification Code (Admin manual setup or auto-regenerate)
  async updateUserRegistrationCode(userId: string, newCode: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const cleanCode = newCode.trim().toUpperCase();
    await updateDoc(userRef, cleanFirestoreData({
      registration_code: cleanCode,
      registration_code_used: false,
      updated_at: new Date().toISOString(),
    }));
  },

  // Verify Registration Code submitted by user (enforcing single-use)
  async verifyRegistrationCode(identifier: string, inputCode: string): Promise<{ success: boolean; user?: FirestoreUserData; error?: string }> {
    try {
      const user = await this.findUserByIdentifier(identifier);
      if (!user) {
        return { success: false, error: 'Akaun pengguna tidak dijumpai.' };
      }
      if (user.status === 'rejected') {
        return { success: false, error: 'Akaun anda telah dinyahaktifkan oleh pihak Pentadbir.' };
      }
      if (user.registration_code_used) {
        return { success: false, error: 'Kod yang dimasukkan telah digunakan atau tidak sah. Sila cuba lagi atau hubungi Admin.' };
      }
      const cleanInput = (inputCode || '').trim().toUpperCase().replace(/\s+/g, '');
      const userCode = (user.registration_code || '').trim().toUpperCase().replace(/\s+/g, '');
      
      if (!userCode || cleanInput !== userCode) {
        return { 
          success: false, 
          error: 'Kod yang dimasukkan tidak sah. Sila cuba lagi.' 
        };
      }
      
      // Approve user and mark verified, mark code as used (single use)
      const userRef = doc(db, USERS_COLLECTION, user.id);
      await updateDoc(userRef, cleanFirestoreData({
        status: 'approved',
        email_verified: true,
        registration_code_used: true,
        updated_at: new Date().toISOString(),
      }));
      
      this.sendUserActivatedAlertDirect({
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        email: user.email,
        registration_code: user.registration_code,
        role: user.role || 'user',
        status: 'approved',
        created_at: user.created_at,
      }).catch(() => {});

      return {
        success: true,
        user: {
          ...user,
          status: 'approved',
          email_verified: true,
          registration_code_used: true,
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Ralat semasa mengesahkan kod.' };
    }
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
          const targetId = data.id || d.id;
          let qadaRequired = 0;
          let qadaCompleted = 0;
          let recordsCount = 0;

          try {
            // Check multiple potential doc ID keys to ensure 100% accuracy
            const [qadaSnap1, qadaSnap2, recordsSnap1, recordsSnap2] = await Promise.all([
              getDoc(doc(db, QADA_COLLECTION, targetId)).catch(() => null),
              d.id !== targetId ? getDoc(doc(db, QADA_COLLECTION, d.id)).catch(() => null) : null,
              getDoc(doc(db, RECORDS_COLLECTION, targetId)).catch(() => null),
              d.id !== targetId ? getDoc(doc(db, RECORDS_COLLECTION, d.id)).catch(() => null) : null,
            ]);

            const activeQadaSnap = (qadaSnap1 && qadaSnap1.exists()) ? qadaSnap1 : ((qadaSnap2 && qadaSnap2.exists()) ? qadaSnap2 : null);
            if (activeQadaSnap && activeQadaSnap.exists()) {
              const qData = activeQadaSnap.data() as QadaRecord;
              qadaRequired = Number(qData.total_required) || 0;
            }

            const activeRecordsSnap = (recordsSnap1 && recordsSnap1.exists()) ? recordsSnap1 : ((recordsSnap2 && recordsSnap2.exists()) ? recordsSnap2 : null);
            if (activeRecordsSnap && activeRecordsSnap.exists()) {
              const recData = activeRecordsSnap.data();
              const items: DailyRecord[] = Array.isArray(recData.items) ? recData.items : [];
              recordsCount = items.length;
              qadaCompleted = items.reduce((sum, r) => sum + (Number(r.days) || 0), 0);
            }
          } catch {
            // stats optional
          }

          return {
            id: targetId,
            username: data.username || targetId,
            name: data.name || data.username || targetId,
            email: data.email || '',
            email_verified: !!data.email_verified,
            role: data.role || 'user',
            status: data.status || 'approved',
            avatar: data.avatar,
            registration_code: data.registration_code || '',
            registration_code_used: !!data.registration_code_used,
            code_type: data.code_type,
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

  // Admin update user's Qada target
  async updateUserQadaTargetAdmin(userId: string, newTotalRequired: number): Promise<void> {
    if (!userId) return;
    const cleanTotal = Math.max(1, Number(newTotalRequired) || 1);
    const docRef = doc(db, QADA_COLLECTION, userId);
    const existing = await getDoc(docRef).catch(() => null);
    
    if (existing && existing.exists()) {
      await updateDoc(docRef, cleanFirestoreData({
        total_required: cleanTotal,
        updated_at: new Date().toISOString(),
      }));
    } else {
      await setDoc(docRef, cleanFirestoreData({
        id: `qada_${userId}`,
        user_id: userId,
        total_required: cleanTotal,
        total_completed: 0,
        remaining: cleanTotal,
        year: new Date().getFullYear().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }), { merge: true });
    }
  },

  // ==========================================
  // ACCESS CODES MANAGEMENT (Akses dengan Kod)
  // ==========================================

  // Get all access codes (Admin)
  async getAllAccessCodes(): Promise<AccessCodeItem[]> {
    try {
      const snaps = await getDocs(collection(db, ACCESS_CODES_COLLECTION));
      const list: AccessCodeItem[] = [];
      snaps.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          code: data.code || d.id,
          is_used: !!data.is_used,
          notes: data.notes || '',
          created_at: data.created_at || new Date().toISOString(),
          created_by: data.created_by || 'admin',
          used_at: data.used_at || null,
          used_by_username: data.used_by_username || null,
          used_by_email: data.used_by_email || null,
        });
      });
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
      console.warn('Firestore getAllAccessCodes error:', err);
      return [];
    }
  },

  // Create new access code (Admin)
  async createAccessCode(customCode?: string, notes?: string, adminUsername?: string): Promise<AccessCodeItem> {
    const rawCode = (customCode && customCode.trim()) ? customCode.trim().toUpperCase() : generateAccessCode();
    const cleanCode = rawCode.replace(/\s+/g, '');
    const codeId = cleanCode.toLowerCase();
    
    const item: AccessCodeItem = {
      id: codeId,
      code: cleanCode,
      is_used: false,
      notes: notes?.trim() || '',
      created_at: new Date().toISOString(),
      created_by: adminUsername || 'admin',
      used_at: null,
      used_by_username: null,
      used_by_email: null,
    };

    await setDoc(doc(db, ACCESS_CODES_COLLECTION, codeId), cleanFirestoreData(item), { merge: true });
    return item;
  },

  // Update access code (Admin)
  async updateAccessCode(id: string, newCode: string, notes?: string): Promise<void> {
    const cleanCode = newCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanId = id.trim().toLowerCase();
    const docRef = doc(db, ACCESS_CODES_COLLECTION, cleanId);
    await updateDoc(docRef, cleanFirestoreData({
      code: cleanCode,
      notes: notes !== undefined ? notes.trim() : undefined,
      updated_at: new Date().toISOString(),
    }));
  },

  // Delete access code (Admin)
  async deleteAccessCode(id: string): Promise<void> {
    const cleanId = id.trim().toLowerCase();
    await deleteDoc(doc(db, ACCESS_CODES_COLLECTION, cleanId));
  },

  // Verify access code validity (User)
  async verifyAccessCode(inputCode: string): Promise<{ valid: boolean; codeItem?: AccessCodeItem; error?: string }> {
    try {
      const cleanInput = (inputCode || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanInput) {
        return { valid: false, error: 'Sila masukkan kod akses.' };
      }

      // 1. Direct doc lookup by lowercase code ID
      const directRef = doc(db, ACCESS_CODES_COLLECTION, cleanInput.toLowerCase());
      const directSnap = await getDoc(directRef).catch(() => null);

      if (directSnap && directSnap.exists()) {
        const item = directSnap.data() as AccessCodeItem;
        if (item.is_used) {
          return { valid: false, error: 'Kod akses ini telah digunakan. Sila dapatkan kod baharu daripada Admin.' };
        }
        return { valid: true, codeItem: item };
      }

      // 2. Query by code field
      const q = query(collection(db, ACCESS_CODES_COLLECTION), where('code', '==', cleanInput), limit(1));
      const querySnaps = await getDocs(q).catch(() => null);

      if (querySnaps && !querySnaps.empty) {
        const item = querySnaps.docs[0].data() as AccessCodeItem;
        if (item.is_used) {
          return { valid: false, error: 'Kod akses ini telah digunakan. Sila dapatkan kod baharu daripada Admin.' };
        }
        return { valid: true, codeItem: item };
      }

      return { valid: false, error: 'Kod akses tidak sah atau tidak dijumpai dalam sistem. Sila semak semula atau hubungi Admin.' };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Ralat semasa menyemak kod akses.' };
    }
  },

  // Redeem / Consume access code when user finishes registration (Akses dengan Kod)
  async redeemAccessCode(code: string, username: string, email: string): Promise<boolean> {
    try {
      const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
      const codeId = cleanCode.toLowerCase();
      
      const docRef = doc(db, ACCESS_CODES_COLLECTION, codeId);
      const snap = await getDoc(docRef).catch(() => null);
      
      if (snap && snap.exists()) {
        await updateDoc(docRef, cleanFirestoreData({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_username: username.trim().toLowerCase(),
          used_by_email: email.trim().toLowerCase(),
        }));
        return true;
      }

      const q = query(collection(db, ACCESS_CODES_COLLECTION), where('code', '==', cleanCode), limit(1));
      const querySnaps = await getDocs(q).catch(() => null);
      if (querySnaps && !querySnaps.empty) {
        await updateDoc(querySnaps.docs[0].ref, cleanFirestoreData({
          is_used: true,
          used_at: new Date().toISOString(),
          used_by_username: username.trim().toLowerCase(),
          used_by_email: email.trim().toLowerCase(),
        }));
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Firestore redeemAccessCode notice:', err);
      return false;
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
    if (!userId) return null;
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
    if (!userId) return;
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
    if (!userId) return [];
    try {
      const snap = await getDoc(doc(db, RECORDS_COLLECTION, userId));
      if (snap.exists()) {
        const data = snap.data();
        return Array.isArray(data?.items) ? data.items : [];
      }
      return [];
    } catch (err) {
      console.warn('Firestore getDailyRecords err:', err);
      return [];
    }
  },

  async saveDailyRecords(userId: string, records: DailyRecord[]): Promise<void> {
    if (!userId) return;
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
    if (!userId) return;
    try {
      await deleteDoc(doc(db, QADA_COLLECTION, userId));
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

  // System Settings: Telegram Bot Configuration Persistence in Firestore
  async getTelegramConfig(): Promise<TelegramFirestoreConfig | null> {
    try {
      const snap = await getDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, 'telegram'));
      if (snap.exists()) {
        return snap.data() as TelegramFirestoreConfig;
      }
      return null;
    } catch (err) {
      console.warn('Firestore getTelegramConfig err:', err);
      return null;
    }
  },

  async saveTelegramConfig(config: TelegramFirestoreConfig): Promise<void> {
    try {
      const payload = cleanFirestoreData({
        botToken: config.botToken || '',
        adminChatId: config.adminChatId || '',
        enabled: config.enabled !== false,
        updated_at: new Date().toISOString(),
      });
      await setDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, 'telegram'), payload, { merge: true });
    } catch (err) {
      console.error('Firestore saveTelegramConfig err:', err);
    }
  },

  // Client-Side Direct Telegram Bot Test & Dispatch (bypasses backend timeout or static mode)
  async testTelegramDirect(botToken: string, adminChatId: string): Promise<{ success: boolean; botUsername?: string; error?: string }> {
    try {
      // 1. Verify Bot Token via Telegram getMe
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        method: 'GET',
      });
      const meData = await meRes.json().catch(() => ({}));
      if (!meData.ok) {
        return {
          success: false,
          error: meData.description || 'Bot Token tidak sah atau tidak dijumpai di Telegram.',
        };
      }

      const botUsername = meData.result?.username;

      // 2. Send Test Notification Message
      const messageText = `🌙 <b>Ujian Sambungan Notifikasi KiraPuasaKu</b>\n\n` +
        `✅ <b>Status:</b> Berjaya Disambungkan!\n` +
        `🤖 <b>Bot:</b> @${botUsername || 'KiraPuasaKuBot'}\n` +
        `🆔 <b>Admin Chat ID:</b> <code>${adminChatId}</code>\n` +
        `📅 <b>Waktu:</b> ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
        `Sistem notifikasi pendaftaran pengguna baharu sedia digunakan dengan lancar.`;

      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: messageText,
          parse_mode: 'HTML',
        }),
      });

      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendData.ok) {
        return {
          success: false,
          error: sendData.description || 'Gagal menghantar mesej ke Admin Chat ID tersebut.',
        };
      }

      return {
        success: true,
        botUsername,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Ralat sambungan rangkaian ke Telegram API.',
      };
    }
  },

  // Client-Side Direct New User Registration Alert Dispatch
  async sendNewUserRegistrationAlertDirect(user: User): Promise<void> {
    try {
      const config = await this.getTelegramConfig();
      if (!config || !config.enabled || !config.botToken || !config.adminChatId) {
        return;
      }

      const text = `🔔 <b>Pendaftaran Pengguna Baharu - KiraPuasaKu</b>\n\n` +
        `👤 <b>Nama:</b> ${user.name}\n` +
        `📛 <b>Username:</b> @${user.username}\n` +
        `📧 <b>Emel:</b> ${user.email}\n` +
        `🏷️ <b>Peranan:</b> ${user.role.toUpperCase()}\n` +
        `📌 <b>Status:</b> ${user.status.toUpperCase()}\n` +
        (user.registration_code ? `🔑 <b>Kod Pengesahan Admin:</b> <code>${user.registration_code}</code>\n` : '') +
        `📅 <b>Didaftarkan:</b> ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
        `<i>Sila log masuk sebagai Admin untuk mengurus kod atau meluluskan akaun jika perlu.</i>`;

      await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.adminChatId,
          text,
          parse_mode: 'HTML',
        }),
      }).catch((e) => console.warn('Direct telegram alert failed:', e));
    } catch {
      // Ignore background notification errors
    }
  },

  // Client-Side Direct User Activated Alert Dispatch
  async sendUserActivatedAlertDirect(user: Partial<User>): Promise<void> {
    try {
      const config = await this.getTelegramConfig();
      if (!config || !config.enabled || !config.botToken || !config.adminChatId) {
        return;
      }

      const text = `✨ <b>KiraPuasaKu: Akaun Berjaya Diaktifkan</b> 🚀\n\n` +
        `👤 <b>Nama:</b> ${user.name || user.username}\n` +
        `📛 <b>Username:</b> @${user.username}\n` +
        `📧 <b>Emel:</b> ${user.email}\n` +
        (user.registration_code ? `🔑 <b>Kod Disahkan:</b> <code>${user.registration_code}</code>\n` : '') +
        `📅 <b>Masa Pengesahan:</b> ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n` +
        `📌 <b>Status:</b> <b>Aktif / Approved</b>`;

      await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.adminChatId,
          text,
          parse_mode: 'HTML',
        }),
      }).catch((e) => console.warn('Direct telegram activation alert failed:', e));
    } catch {
      // Ignore background notification errors
    }
  },
};
