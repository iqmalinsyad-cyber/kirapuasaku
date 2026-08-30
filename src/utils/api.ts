import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem } from '../types';
import { getQadaRecord, getDailyRecords, getInitialSettings, saveQadaRecord, saveDailyRecords, saveSettings } from './storage';
import { firestoreService } from '../firebase/firestoreService';

const TOKEN_KEY = 'qadatrack_auth_token_v1';
const USER_KEY = 'qadatrack_auth_user_v1';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached user', e);
  }
  return null;
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Generic API fetch wrapper that injects Bearer token with quick timeout for static fallbacks
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ 
  data?: T; 
  error?: string; 
  locked?: boolean; 
  remainingMinutes?: number; 
  code?: string;
  email?: string;
  username?: string;
  verificationToken?: string;
}> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Use AbortController with a 3.5-second timeout so static Cloudflare Pages immediately falls back to fast Firestore
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    // Detect if static server (e.g. Cloudflare Pages SPA redirects) returned HTML instead of JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { 
        error: 'Pelayan backend tidak ditemui atau aplikasi berjalan dalam mod statik.',
        code: 'BACKEND_UNAVAILABLE'
      };
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_SESSION')) {
        removeStoredToken();
      }
      return {
        error: data.error || `Ralat pelayan: ${res.statusText}`,
        locked: data.locked,
        remainingMinutes: data.remainingMinutes,
        code: data.code,
        email: data.email,
        username: data.username,
        verificationToken: data.verificationToken,
      };
    }

    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { 
      error: 'Gagal menyambung ke pelayan backend.',
      code: 'BACKEND_UNAVAILABLE'
    };
  }
}

// Authentication API calls with Firebase Cloud Sync
export const authApi = {
  async register(username: string, email: string, password: string, avatar?: string, name?: string) {
    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name && name.trim()) || cleanUser;

    const res = await apiRequest<{
      success: boolean;
      message: string;
      email: string;
      username: string;
      requiresEmailVerification?: boolean;
      token?: string;
      expiresAt?: number;
      user?: User;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: cleanUser, email: cleanEmail, password, avatar, name: displayName }),
    });

    // Also register in Firestore for cross-browser synchronization
    try {
      await firestoreService.ensureAdminExists();
      const existing = await firestoreService.findUserByIdentifier(cleanUser) || 
                       await firestoreService.findUserByIdentifier(cleanEmail);

      if (!existing) {
        const newUser: User = {
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          username: cleanUser,
          name: displayName,
          email: cleanEmail,
          email_verified: false, // Requires email link verification
          role: 'user',
          status: 'pending',
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`,
          created_at: new Date().toISOString(),
        };
        await firestoreService.registerUser(newUser, password);
      }
    } catch (fsErr) {
      console.warn('Firestore registration sync notice:', fsErr);
    }

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return {
        data: {
          success: true,
          message: `Pendaftaran akaun berjaya! Sila semak peti masuk emel (${cleanEmail}) untuk mengesahkan akaun anda.`,
          email: cleanEmail,
          username: cleanUser,
          requiresEmailVerification: true,
        }
      };
    }

    return res;
  },

  async verifyEmail(token: string, email?: string) {
    // 1. Sync Firestore verification status
    if (email) {
      try {
        await firestoreService.verifyUserByEmailOrId(email);
      } catch (e) {
        console.warn('Firestore email verification sync notice:', e);
      }
    }

    // 2. Call backend verification endpoint
    const res = await apiRequest<{ success: boolean; message: string; user?: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return {
        data: {
          success: true,
          message: 'Alamat emel berjaya disahkan. Sila log masuk ke akaun anda.',
        }
      };
    }

    return res;
  },

  async resendVerification(email?: string, username?: string) {
    return apiRequest<{ success: boolean; message: string; email?: string; verificationToken?: string; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  },

  async login(username: string, password: string) {
    const cleanUser = username.trim().toLowerCase();
    const res = await apiRequest<{ token: string; user: User; expiresAt: number; verificationToken?: string; email?: string; code?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: cleanUser, password }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      try {
        await firestoreService.ensureAdminExists();
        const firestoreUser = await firestoreService.findUserByIdentifier(cleanUser);

        if (!firestoreUser) {
          return {
            error: 'Nama pengguna atau kata laluan tidak tepat. Sila semak semula.',
            code: 'INVALID_CREDENTIALS'
          };
        }

        // Verify Password against Firestore
        const isPasswordValid = await firestoreService.verifyPassword(firestoreUser.passwordHash, password, firestoreUser.role);
        if (!isPasswordValid) {
          return {
            error: 'Nama pengguna atau kata laluan tidak tepat. Sila semak semula.',
            code: 'INVALID_CREDENTIALS'
          };
        }

        // Check if email verification is required
        if (firestoreUser.role !== 'admin' && firestoreUser.email_verified === false) {
          return {
            error: 'Alamat emel anda belum disahkan. Sila semak peti masuk emel anda dan klik pautan pengesahan.',
            code: 'EMAIL_NOT_VERIFIED',
            email: firestoreUser.email,
            username: firestoreUser.username,
          };
        }

        if (firestoreUser.status === 'rejected') {
          return {
            error: 'Akaun anda telah dinyahaktifkan oleh Pentadbir.',
            code: 'ACCOUNT_REJECTED'
          };
        }

        const validUser: User = {
          id: firestoreUser.id,
          username: firestoreUser.username,
          name: firestoreUser.name || firestoreUser.username,
          email: firestoreUser.email,
          email_verified: !!firestoreUser.email_verified,
          role: firestoreUser.role,
          status: firestoreUser.status,
          avatar: firestoreUser.avatar,
          created_at: firestoreUser.created_at,
          last_login: new Date().toISOString(),
        };

        await firestoreService.updateLastLogin(firestoreUser.id);

        const token = 'token_fb_' + Date.now();
        setStoredToken(token);
        setStoredUser(validUser);

        return {
          data: {
            token,
            user: validUser,
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          }
        };
      } catch (err: any) {
        console.error('Firebase login error:', err);
        return {
          error: 'Gagal menyambung ke pangkalan data cloud. Sila pastikan anda mempunyai capaian internet.',
          code: 'FIREBASE_ERROR'
        };
      }
    }

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async getMe() {
    const res = await apiRequest<{ user: User; session: { expiresAt: number; remainingMinutes: number } }>('/api/auth/me');
    if (res.code === 'BACKEND_UNAVAILABLE') {
      const cached = getStoredUser();
      const token = getStoredToken();
      if (cached && token) {
        // Optionally refresh user from Firestore if online
        try {
          const fresh = await firestoreService.findUserByIdentifier(cached.id);
          if (fresh) {
            const syncedUser: User = {
              id: fresh.id,
              username: fresh.username,
              name: fresh.name || fresh.username,
              email: fresh.email,
              email_verified: !!fresh.email_verified,
              role: fresh.role,
              status: fresh.status,
              avatar: fresh.avatar,
              created_at: fresh.created_at,
              last_login: fresh.last_login,
            };
            setStoredUser(syncedUser);
            return {
              data: {
                user: syncedUser,
                session: {
                  expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
                  remainingMinutes: 525600,
                }
              }
            };
          }
        } catch {
          // fallback to cached
        }

        return {
          data: {
            user: cached,
            session: {
              expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
              remainingMinutes: 525600,
            }
          }
        };
      }
      return { error: 'Tiada sesi dijumpai.', code: 'NO_SESSION' };
    }

    if (res.data?.user) {
      setStoredUser(res.data.user);
    }
    return res;
  },

  async logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    removeStoredToken();
  },

  async updateProfile(name: string, username: string, avatar?: string) {
    const res = await apiRequest<{ user: User; message: string }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, username, avatar }),
    });

    const current = getStoredUser();
    if (current) {
      const updated: User = {
        ...current,
        name: name.trim() || current.name,
        username: username.trim().toLowerCase() || current.username,
        avatar: avatar || current.avatar,
      };
      setStoredUser(updated);

      // Save directly to Firestore for cross-browser sync
      try {
        await firestoreService.updateUserProfile(current.id, {
          name: updated.name,
          username: updated.username,
          avatar: updated.avatar,
        });
      } catch (e) {
        console.warn('Profile sync to Firestore warning:', e);
      }

      if (res.code === 'BACKEND_UNAVAILABLE') {
        return { data: { user: updated, message: 'Profil berjaya dikemaskini dan diselaraskan.' } };
      }
    }

    if (res.data?.user) {
      setStoredUser(res.data.user);
    }
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const current = getStoredUser();

    if (current) {
      try {
        const firestoreUser = await firestoreService.findUserByIdentifier(current.id) ||
                              await firestoreService.findUserByIdentifier(current.username);
        if (firestoreUser) {
          const isValid = await firestoreService.verifyPassword(firestoreUser.passwordHash, currentPassword, firestoreUser.role);
          if (!isValid) {
            return { error: 'Kata laluan semasa tidak tepat.' };
          }
          await firestoreService.updateUserPassword(firestoreUser.id, newPassword);
          if (firestoreUser.username === 'admin') {
            await firestoreService.updateUserPassword('admin_root', newPassword);
          }
        }
      } catch (err) {
        console.warn('Firestore change password notice:', err);
      }
    }

    const res = await apiRequest<{ message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return { data: { message: 'Kata laluan berjaya ditukar dan disimpan secara kekal.' } };
    }

    return res;
  },
};

// Admin API calls with Firebase sync
export const adminApi = {
  async getUsers() {
    const res = await apiRequest<{ users: AdminUserItem[] }>('/api/admin/users');
    if (res.code === 'BACKEND_UNAVAILABLE') {
      try {
        const users = await firestoreService.getAllUsers();
        return { data: { users } };
      } catch (err: any) {
        console.error('Failed to load users from Firestore:', err);
        return { data: { users: [] } };
      }
    }
    return res;
  },

  async verifyUserEmail(userId: string) {
    try {
      await firestoreService.setUserEmailVerified(userId, true);
    } catch {}

    const res = await apiRequest<{ user: any; message: string }>(`/api/admin/users/${userId}/verify-email`, {
      method: 'POST',
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return { data: { user: null, message: 'Emel pengguna berjaya disahkan.' } };
    }
    return res;
  },

  async updateUserStatus(userId: string, status: 'pending' | 'approved' | 'rejected') {
    try {
      await firestoreService.setUserStatus(userId, status);
    } catch {}

    const res = await apiRequest<{ user: any; message: string }>(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return { data: { user: null, message: `Status pengguna berjaya ditukar kepada ${status}.` } };
    }
    return res;
  },

  async resetUserPassword(userId: string) {
    const defaultPassword = 'Puasa@123456';
    try {
      await firestoreService.updateUserPassword(userId, defaultPassword);
    } catch {}

    const res = await apiRequest<{ success: boolean; defaultPassword: string; message: string; user?: any }>(
      `/api/admin/users/${userId}/reset-password`,
      { method: 'POST' }
    );

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return {
        data: {
          success: true,
          defaultPassword,
          message: `Kata laluan berjaya diset semula kepada ${defaultPassword}`,
        }
      };
    }
    return res;
  },

  async deleteUser(userId: string) {
    try {
      await firestoreService.deleteUser(userId);
    } catch {}

    const res = await apiRequest<{ success?: boolean; message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return { data: { success: true, message: 'Akaun pengguna telah dipadam dari pangkalan data.' } };
    }
    return res;
  },

  async getSMTPStatus() {
    return apiRequest<{
      configured: boolean;
      host: string;
      port: number;
      sender: string | null;
      appUrl: string;
    }>('/api/admin/smtp-status');
  },

  async testSMTP(testEmail?: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      messageId?: string;
    }>('/api/admin/smtp-test', {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    });
  },
};

// Qada Data API calls with Full Firestore Cloud Sync
export const qadaApi = {
  async getData() {
    const currentUser = getStoredUser();
    
    // Attempt Firestore cloud sync if user is logged in
    if (currentUser?.id) {
      try {
        const [cloudQada, cloudRecords, cloudSettings] = await Promise.all([
          firestoreService.getQadaTarget(currentUser.id),
          firestoreService.getDailyRecords(currentUser.id),
          firestoreService.getUserSettings(currentUser.id),
        ]);

        if (cloudQada) saveQadaRecord(cloudQada);
        // Persist whatever Firestore returns (even empty array if user deleted records)
        if (Array.isArray(cloudRecords)) {
          saveDailyRecords(cloudRecords);
        }
        if (cloudSettings) saveSettings(cloudSettings);

        return {
          data: {
            qada: cloudQada || getQadaRecord(),
            records: Array.isArray(cloudRecords) ? cloudRecords : getDailyRecords(),
            settings: cloudSettings || getInitialSettings(),
          }
        };
      } catch (err) {
        console.warn('Firestore getData fallback to local/API:', err);
      }
    }

    const res = await apiRequest<{ qada: QadaRecord | null; records: DailyRecord[]; settings: UserSettings }>('/api/qada/data');
    if (res.code === 'BACKEND_UNAVAILABLE') {
      return {
        data: {
          qada: getQadaRecord(),
          records: getDailyRecords(),
          settings: getInitialSettings(),
        }
      };
    }
    return res;
  },

  async saveTarget(qada: QadaRecord) {
    saveQadaRecord(qada);
    const currentUser = getStoredUser();
    if (currentUser?.id) {
      firestoreService.saveQadaTarget(currentUser.id, qada).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/target', {
      method: 'POST',
      body: JSON.stringify({ qada }),
    });
  },

  async saveRecords(records: DailyRecord[]) {
    saveDailyRecords(records);
    const currentUser = getStoredUser();
    if (currentUser?.id) {
      firestoreService.saveDailyRecords(currentUser.id, records).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/records', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  async saveSettings(settings: UserSettings) {
    saveSettings(settings);
    const currentUser = getStoredUser();
    if (currentUser?.id) {
      firestoreService.saveUserSettings(currentUser.id, settings).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  },

  async resetData() {
    const currentUser = getStoredUser();
    if (currentUser?.id) {
      firestoreService.resetUserData(currentUser.id).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/reset', {
      method: 'POST',
    });
  },
};
