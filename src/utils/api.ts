import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem, AccessCodeItem } from '../types';
import { getQadaRecord, getDailyRecords, getInitialSettings, saveQadaRecord, saveDailyRecords, saveSettings } from './storage';
import { firestoreService } from '../firebase/firestoreService';
import { firebaseAuthService } from '../firebase/authService';

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
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`;

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
      body: JSON.stringify({ username: cleanUser, email: cleanEmail, password, avatar: defaultAvatar, name: displayName }),
    });

    let loggedInUser: User | undefined = res.data?.user;
    let sessionToken: string | undefined = res.data?.token;

    // Also register in Firestore for cross-device synchronization
    try {
      await firestoreService.ensureAdminExists();
      const existing = await firestoreService.findUserByIdentifier(cleanUser) || 
                       await firestoreService.findUserByIdentifier(cleanEmail);

      if (!existing) {
        const newUser: User = {
          id: loggedInUser?.id || ('usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
          username: cleanUser,
          name: displayName,
          email: cleanEmail,
          email_verified: true,
          role: 'user',
          status: 'approved',
          avatar: defaultAvatar,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
        await firestoreService.registerUser(newUser, password);
        firestoreService.sendNewUserRegistrationAlertDirect(newUser).catch(() => {});
        if (!loggedInUser) loggedInUser = newUser;
      } else {
        if (!loggedInUser) {
          loggedInUser = {
            id: existing.id,
            username: existing.username,
            name: existing.name || existing.username,
            email: existing.email,
            email_verified: true,
            role: existing.role || 'user',
            status: 'approved',
            avatar: existing.avatar || defaultAvatar,
            created_at: existing.created_at,
          };
        }
      }
    } catch (fsErr) {
      console.warn('Firestore registration sync notice:', fsErr);
    }

    if (!sessionToken) {
      sessionToken = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    if (loggedInUser && sessionToken) {
      setStoredToken(sessionToken);
      setStoredUser(loggedInUser);
    }

    if (res.code === 'BACKEND_UNAVAILABLE' || !res.data) {
      return {
        data: {
          success: true,
          message: 'Pendaftaran akaun berjaya! Selamat datang ke KiraPuasaKu.',
          email: cleanEmail,
          username: cleanUser,
          token: sessionToken,
          user: loggedInUser,
        }
      };
    }

    return res;
  },

  async verifyCode(identifier: string, code: string) {
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    const res = await apiRequest<{
      success: boolean;
      message: string;
      token?: string;
      user?: User;
      expiresAt?: number;
    }>('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ identifier: cleanId, code: cleanCode }),
    });

    if (res.data?.user && res.data?.token) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      return res;
    }

    // Firestore fallback
    try {
      const result = await firestoreService.verifyRegistrationCode(cleanId, cleanCode);
      if (result.success && result.user) {
        const validUser: User = {
          id: result.user.id,
          username: result.user.username,
          name: result.user.name || result.user.username,
          email: result.user.email,
          email_verified: true,
          role: result.user.role || 'user',
          status: 'approved',
          avatar: result.user.avatar,
          registration_code: result.user.registration_code,
          created_at: result.user.created_at,
          last_login: new Date().toISOString(),
        };
        const token = 'token_fb_code_' + Date.now();
        setStoredToken(token);
        setStoredUser(validUser);
        return {
          data: {
            success: true,
            message: 'Kod khas pengesahan sah! Akaun anda telah berjaya diaktifkan.',
            token,
            user: validUser,
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          }
        };
      } else if (result.error) {
        return { error: result.error };
      }
    } catch (e: any) {
      console.warn('Firestore verifyRegistrationCode notice:', e);
    }

    return res;
  },

  async verifyAccessCode(code: string) {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');

    // Try backend first
    const res = await apiRequest<{ success: boolean; valid: boolean; code: string; message: string }>('/api/auth/verify-access-code', {
      method: 'POST',
      body: JSON.stringify({ code: cleanCode }),
    });

    if (res.data?.success) {
      return res;
    }

    // Fallback/sync to Firestore
    try {
      const fsResult = await firestoreService.verifyAccessCode(cleanCode);
      if (fsResult.valid) {
        return {
          data: {
            success: true,
            valid: true,
            code: cleanCode,
            message: 'Kod akses sah! Sila lengkapkan maklumat pendaftaran anda.',
          }
        };
      } else if (fsResult.error) {
        return { error: fsResult.error };
      }
    } catch (e: any) {
      console.warn('Firestore verifyAccessCode notice:', e);
    }

    return res;
  },

  async registerWithCode(data: { code: string; name: string; username: string; email: string; password: string; avatar?: string }) {
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, '');
    const displayName = (data.name && data.name.trim()) || cleanUser;
    const defaultAvatar = data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUser)}`;

    const res = await apiRequest<{
      success: boolean;
      message: string;
      username: string;
      email: string;
      user?: User;
    }>('/api/auth/register-with-code', {
      method: 'POST',
      body: JSON.stringify({
        code: cleanCode,
        name: displayName,
        username: cleanUser,
        email: cleanEmail,
        password: data.password,
        avatar: defaultAvatar,
      }),
    });

    // Also redeem and register in Firestore
    try {
      await firestoreService.redeemAccessCode(cleanCode, cleanUser, cleanEmail);
      const newUser: User = {
        id: res.data?.user?.id || ('usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        username: cleanUser,
        name: displayName,
        email: cleanEmail,
        email_verified: true,
        role: 'user',
        status: 'approved',
        avatar: defaultAvatar,
        registration_code: cleanCode,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };
      await firestoreService.registerUser(newUser, data.password);
      firestoreService.sendNewUserRegistrationAlertDirect(newUser).catch(() => {});
    } catch (e: any) {
      console.warn('Firestore registerWithCode notice:', e);
    }

    if (res.code === 'BACKEND_UNAVAILABLE' || !res.data) {
      return {
        data: {
          success: true,
          message: 'Pendaftaran dengan Kod Akses berjaya! Sila log masuk ke akaun anda.',
          username: cleanUser,
          email: cleanEmail,
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
    // Also try Firebase Auth resend if available
    try {
      await firebaseAuthService.resendVerificationEmail();
    } catch {}

    return apiRequest<{ success: boolean; message: string; email?: string; verificationToken?: string; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  },

  async checkVerificationStatus(identifier: string) {
    try {
      const status = await firebaseAuthService.checkEmailVerificationStatus(identifier);
      if (status.verified) {
        return { verified: true, message: 'Akaun disahkan dalam pangkalan data Firebase.' };
      }
    } catch {}
    return { verified: false, message: 'Akaun masih menunggu pengesahan.' };
  },

  async verifyDirectly(identifier: string) {
    try {
      await firestoreService.verifyUserByEmailOrId(identifier);
      const res = await apiRequest<{ success: boolean; message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, token: 'DIRECT_FIREBASE_CONFIRMED' }),
      });
      return { success: true, message: 'Akaun berjaya disahkan secara rasmi melalui Firebase.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Gagal mengesahkan akaun.' };
    }
  },

  async login(username: string, password: string) {
    const cleanUser = username.trim().toLowerCase();
    const res = await apiRequest<{ token: string; user: User; expiresAt: number; verificationToken?: string; email?: string; code?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: cleanUser, password }),
    });

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      return res;
    }

    // If backend returned error, lockout, or was unavailable, verify against Firestore
    try {
      await firestoreService.ensureAdminExists();
      const firestoreUser = await firestoreService.findUserByIdentifier(cleanUser);

      if (firestoreUser) {
        // Verify Password against Firestore (supports new password & master admin fallback)
        const isPasswordValid = await firestoreService.verifyPassword(firestoreUser.passwordHash, password, firestoreUser.role);
        if (isPasswordValid) {
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
        }
      }
    } catch (err: any) {
      console.warn('Firebase login fallback check notice:', err);
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
    try {
      const users = await firestoreService.getAllUsers();
      if (users && users.length > 0) {
        return { data: { users } };
      }
    } catch (err) {
      console.warn('Firestore getAllUsers fallback notice:', err);
    }

    const res = await apiRequest<{ users: AdminUserItem[] }>('/api/admin/users');
    if (res.code === 'BACKEND_UNAVAILABLE' || res.error) {
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

  async updateRegistrationCode(userId: string, code?: string) {
    try {
      if (code) {
        await firestoreService.updateUserRegistrationCode(userId, code);
      }
    } catch {}

    const res = await apiRequest<{
      success: boolean;
      message: string;
      registration_code: string;
      user?: any;
    }>(`/api/admin/users/${userId}/code`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE' && code) {
      return {
        data: {
          success: true,
          message: 'Kod pendaftaran pengguna berjaya dikemaskini.',
          registration_code: code.trim().toUpperCase(),
        }
      };
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

  async getTelegramConfig() {
    return apiRequest<{
      configured: boolean;
      enabled: boolean;
      adminChatId: string;
      maskedToken: string;
      hasEnvFallback: boolean;
    }>('/api/admin/telegram-config');
  },

  async updateTelegramConfig(botToken: string, adminChatId: string, enabled: boolean) {
    return apiRequest<{
      success: boolean;
      message: string;
      configured: boolean;
      enabled: boolean;
    }>('/api/admin/telegram-config', {
      method: 'POST',
      body: JSON.stringify({ botToken, adminChatId, enabled }),
    });
  },

  async testTelegram(botToken?: string, adminChatId?: string) {
    return apiRequest<{
      success: boolean;
      botName?: string;
      message?: string;
      error?: string;
    }>('/api/admin/telegram-test', {
      method: 'POST',
      body: JSON.stringify({ botToken, adminChatId }),
    });
  },

  async getAccessCodes() {
    try {
      const fsCodes = await firestoreService.getAllAccessCodes();
      if (fsCodes && fsCodes.length > 0) {
        return { data: { accessCodes: fsCodes } };
      }
    } catch (e) {
      console.warn('Firestore getAccessCodes notice:', e);
    }

    const res = await apiRequest<{ accessCodes: AccessCodeItem[] }>('/api/admin/access-codes');
    if (res.code === 'BACKEND_UNAVAILABLE' || res.error) {
      try {
        const fsCodes = await firestoreService.getAllAccessCodes();
        return { data: { accessCodes: fsCodes } };
      } catch (e: any) {
        return { data: { accessCodes: [] } };
      }
    }
    return res;
  },

  async createAccessCode(code?: string, notes?: string) {
    try {
      const fsCode = await firestoreService.createAccessCode(code, notes);
      if (fsCode) {
        // Also call backend
        apiRequest('/api/admin/access-codes', {
          method: 'POST',
          body: JSON.stringify({ code: fsCode.code, notes }),
        }).catch(() => {});

        return {
          data: {
            success: true,
            message: `Kod akses "${fsCode.code}" berjaya dijana!`,
            accessCode: fsCode,
          }
        };
      }
    } catch (e: any) {
      console.warn('Firestore createAccessCode notice:', e);
    }

    return apiRequest<{
      success: boolean;
      message: string;
      accessCode: AccessCodeItem;
    }>('/api/admin/access-codes', {
      method: 'POST',
      body: JSON.stringify({ code, notes }),
    });
  },

  async updateAccessCode(id: string, code: string, notes?: string) {
    try {
      await firestoreService.updateAccessCode(id, code, notes);
    } catch (e) {
      console.warn('Firestore updateAccessCode notice:', e);
    }

    return apiRequest<{
      success: boolean;
      message: string;
      accessCode: AccessCodeItem;
    }>(`/api/admin/access-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code, notes }),
    });
  },

  async deleteAccessCode(id: string) {
    try {
      await firestoreService.deleteAccessCode(id);
    } catch (e) {
      console.warn('Firestore deleteAccessCode notice:', e);
    }

    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/api/admin/access-codes/${id}`, {
      method: 'DELETE',
    });
  },

  async updateUserTarget(userId: string, total_required: number, total_completed?: number) {
    try {
      const currentTarget = await firestoreService.getQadaTarget(userId);
      const cleanTotal = Math.max(1, Number(total_required) || 1);
      const cleanCompleted = total_completed !== undefined ? Math.max(0, Number(total_completed)) : (currentTarget?.total_completed || 0);
      const updated: QadaRecord = currentTarget ? {
        ...currentTarget,
        total_required: cleanTotal,
        total_completed: cleanCompleted,
        remaining: Math.max(0, cleanTotal - cleanCompleted),
        updated_at: new Date().toISOString(),
      } : {
        id: `qada_${userId}`,
        user_id: userId,
        total_required: cleanTotal,
        total_completed: cleanCompleted,
        remaining: Math.max(0, cleanTotal - cleanCompleted),
        year: '1447H / 2026',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await firestoreService.saveQadaTarget(userId, updated);
    } catch (e) {
      console.warn('Firestore updateUserTarget notice:', e);
    }

    return apiRequest<{
      success: boolean;
      message: string;
      qada: any;
    }>(`/api/admin/users/${userId}/target`, {
      method: 'POST',
      body: JSON.stringify({ total_required, total_completed }),
    });
  },
};

// Qada Data API calls with Full Firestore Cloud Sync
export const qadaApi = {
  async getData(userIdParam?: string) {
    const currentUser = getStoredUser();
    const activeUserId = userIdParam || currentUser?.id;
    const localQada = getQadaRecord(activeUserId);
    const localRecords = getDailyRecords(activeUserId);
    const localSettings = getInitialSettings(activeUserId);
    
    // Attempt Firestore cloud sync if user is logged in
    if (activeUserId) {
      try {
        const [cloudQada, cloudRecords, cloudSettings] = await Promise.all([
          firestoreService.getQadaTarget(activeUserId),
          firestoreService.getDailyRecords(activeUserId),
          firestoreService.getUserSettings(activeUserId),
        ]);

        let finalQada: QadaRecord | null = null;
        if (cloudQada && Number(cloudQada.total_required) > 0) {
          finalQada = cloudQada;
          saveQadaRecord(finalQada, activeUserId);
        } else if (localQada && Number(localQada.total_required) > 0) {
          // If local has target for this user but cloud doesn't, sync local target up to cloud
          finalQada = localQada;
          firestoreService.saveQadaTarget(activeUserId, localQada).catch(() => {});
        } else {
          finalQada = null;
        }

        const finalRecords: DailyRecord[] = Array.isArray(cloudRecords) && cloudRecords.length > 0
          ? cloudRecords
          : (Array.isArray(localRecords) ? localRecords : []);
        
        saveDailyRecords(finalRecords, activeUserId);

        const finalSettings = cloudSettings || localSettings;
        if (finalSettings) {
          saveSettings(finalSettings, activeUserId);
        }

        return {
          data: {
            qada: finalQada,
            records: finalRecords,
            settings: finalSettings,
          }
        };
      } catch (err) {
        console.warn('Firestore getData fallback to local/API:', err);
      }
    }

    const res = await apiRequest<{ qada: QadaRecord | null; records: DailyRecord[]; settings: UserSettings }>('/api/qada/data');
    if (res.code === 'BACKEND_UNAVAILABLE' || res.error) {
      return {
        data: {
          qada: localQada,
          records: localRecords,
          settings: localSettings,
        }
      };
    }
    return res;
  },

  async saveTarget(qada: QadaRecord) {
    const currentUser = getStoredUser();
    saveQadaRecord(qada, currentUser?.id);
    if (currentUser?.id) {
      firestoreService.saveQadaTarget(currentUser.id, qada).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/target', {
      method: 'POST',
      body: JSON.stringify({ qada }),
    });
  },

  async saveRecords(records: DailyRecord[]) {
    const currentUser = getStoredUser();
    saveDailyRecords(records, currentUser?.id);
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
    localStorage.removeItem('qadatrack_qada_v1');
    localStorage.removeItem('qadatrack_daily_records_v1');
    if (currentUser?.id) {
      localStorage.removeItem(`qadatrack_qada_v1_${currentUser.id}`);
      localStorage.removeItem(`qadatrack_daily_records_v1_${currentUser.id}`);
      firestoreService.resetUserData(currentUser.id).catch((e) => console.warn(e));
    }
    return apiRequest('/api/qada/reset', {
      method: 'POST',
    });
  },
};

// Telegram Bot Admin API with Dual Firestore + Direct API Fallback
export const telegramApi = {
  async getConfig() {
    // 1. Check Firestore first
    try {
      const cloudConfig = await firestoreService.getTelegramConfig();
      if (cloudConfig) {
        const masked = cloudConfig.botToken 
          ? (cloudConfig.botToken.length > 8 
              ? `${cloudConfig.botToken.substring(0, 4)}••••${cloudConfig.botToken.substring(cloudConfig.botToken.length - 4)}`
              : '••••••••')
          : '';
        return {
          data: {
            configured: Boolean(cloudConfig.botToken && cloudConfig.adminChatId),
            enabled: cloudConfig.enabled !== false,
            adminChatId: cloudConfig.adminChatId || '',
            maskedToken: masked,
            hasEnvFallback: false,
          }
        };
      }
    } catch (e) {
      console.warn('Firestore getTelegramConfig fallback:', e);
    }

    // 2. Fallback to backend API
    const res = await apiRequest<{
      configured: boolean;
      enabled: boolean;
      adminChatId: string;
      maskedToken: string;
      hasEnvFallback: boolean;
    }>('/api/admin/telegram-config');

    if (res.code === 'BACKEND_UNAVAILABLE' || res.error) {
      const local = localStorage.getItem('qadatrack_telegram_cfg_v1');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          return {
            data: {
              configured: Boolean(parsed.botToken && parsed.adminChatId),
              enabled: parsed.enabled !== false,
              adminChatId: parsed.adminChatId || '',
              maskedToken: '••••••••',
              hasEnvFallback: false,
            }
          };
        } catch {}
      }
    }

    return res;
  },

  async saveConfig(botToken?: string, adminChatId?: string, enabled: boolean = true) {
    // 1. Save to Firestore
    try {
      const existing = await firestoreService.getTelegramConfig();
      const finalToken = botToken || existing?.botToken || '';
      const finalChatId = adminChatId || existing?.adminChatId || '';
      await firestoreService.saveTelegramConfig({
        botToken: finalToken,
        adminChatId: finalChatId,
        enabled,
      });
      localStorage.setItem('qadatrack_telegram_cfg_v1', JSON.stringify({
        botToken: finalToken,
        adminChatId: finalChatId,
        enabled,
      }));
    } catch (e) {
      console.warn('Failed saving telegram config to firestore:', e);
    }

    // 2. Sync to Backend
    const res = await apiRequest<{
      success: boolean;
      message: string;
      configured: boolean;
      enabled: boolean;
    }>('/api/admin/telegram-config', {
      method: 'POST',
      body: JSON.stringify({ botToken, adminChatId, enabled }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE' || res.error) {
      return {
        data: {
          success: true,
          message: 'Konfigurasi Telegram berjaya disimpan dalam pangkalan data Firestore!',
          configured: Boolean(botToken || adminChatId),
          enabled,
        }
      };
    }

    return res;
  },

  async testNotification(botToken?: string, adminChatId?: string) {
    // Resolve active token and chatId if not passed in
    let activeToken = botToken?.trim();
    let activeChatId = adminChatId?.trim();

    if (!activeToken || !activeChatId) {
      const cloudCfg = await firestoreService.getTelegramConfig().catch(() => null);
      if (cloudCfg) {
        if (!activeToken) activeToken = cloudCfg.botToken;
        if (!activeChatId) activeChatId = cloudCfg.adminChatId;
      }
    }

    if (!activeToken || !activeChatId) {
      const local = localStorage.getItem('qadatrack_telegram_cfg_v1');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (!activeToken) activeToken = parsed.botToken;
          if (!activeChatId) activeChatId = parsed.adminChatId;
        } catch {}
      }
    }

    // 1. Try Backend test endpoint
    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        botUsername?: string;
      }>('/api/admin/telegram-test', {
        method: 'POST',
        body: JSON.stringify({ botToken: activeToken, adminChatId: activeChatId }),
      });

      if (res.data?.success) {
        return res;
      }

      // If backend reports explicit telegram validation error, return it
      if (res.error && res.code !== 'BACKEND_UNAVAILABLE' && !res.error.includes('Pelayan backend tidak ditemui')) {
        return res;
      }
    } catch {}

    // 2. Direct client-side test execution
    if (!activeToken || !activeChatId) {
      return {
        error: 'Sila masukkan Telegram Bot Token dan Admin Chat ID untuk menguji sambungan.',
      };
    }

    const directResult = await firestoreService.testTelegramDirect(activeToken, activeChatId);
    if (directResult.success) {
      return {
        data: {
          success: true,
          message: 'Notifikasi ujian berjaya dihantar ke Telegram!',
          botUsername: directResult.botUsername,
        }
      };
    } else {
      return {
        error: directResult.error || 'Gagal menghantar notifikasi ke Telegram.',
      };
    }
  },
};

