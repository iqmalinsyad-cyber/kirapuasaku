import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem } from '../types';
import { getQadaRecord, getDailyRecords, getInitialSettings, saveQadaRecord, saveDailyRecords, saveSettings } from './storage';

const TOKEN_KEY = 'qadatrack_auth_token_v1';
const USER_KEY = 'qadatrack_auth_user_v1';
const LOCAL_USERS_KEY = 'qadatrack_local_users_v1';

interface LocalUserRecord {
  user: User;
  passwordHash: string;
}

function getLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local users store', e);
  }
  // Default fallback admin user for standalone client deployment
  const defaultAdmin: LocalUserRecord = {
    user: {
      id: 'admin_root',
      username: 'admin',
      name: 'Pentadbir KiraPuasaKu',
      email: 'admin@kirapuasaku.app',
      email_verified: true,
      role: 'admin',
      status: 'approved',
      created_at: new Date().toISOString(),
    },
    passwordHash: 'admin123'
  };
  return [defaultAdmin];
}

function saveLocalUsers(users: LocalUserRecord[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users', e);
  }
}

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

// Generic API fetch wrapper that injects Bearer token
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

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

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
    console.warn(`API unavailable on ${endpoint}, switching to resilient mode:`, err);
    return { 
      error: 'Gagal menyambung ke pelayan backend.',
      code: 'BACKEND_UNAVAILABLE'
    };
  }
}

// Authentication API calls with Dual-Engine (Server API + Cloudflare Pages static fallback)
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
      token?: string;
      expiresAt?: number;
      user: User;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: cleanUser, email: cleanEmail, password, avatar, name: displayName }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      // Standalone / Cloudflare Pages client-side mode
      const localUsers = getLocalUsers();
      const existing = localUsers.find(
        (u) => u.user.username === cleanUser || u.user.email === cleanEmail
      );

      if (existing) {
        return {
          error: 'Nama pengguna atau alamat emel telah didaftarkan dalam sistem.',
          code: 'USER_EXISTS'
        };
      }

      const newUser: User = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        username: cleanUser,
        name: displayName,
        email: cleanEmail,
        email_verified: true,
        role: localUsers.length === 0 ? 'admin' : 'user',
        status: 'approved',
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      };

      localUsers.push({ user: newUser, passwordHash: password });
      saveLocalUsers(localUsers);

      const token = 'token_local_' + Date.now();
      setStoredToken(token);
      setStoredUser(newUser);

      return {
        data: {
          success: true,
          message: 'Pendaftaran akaun berjaya! Selamat datang ke KiraPuasaKu.',
          email: cleanEmail,
          username: cleanUser,
          token,
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          user: newUser,
        }
      };
    }

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async verifyEmail(token: string, email?: string) {
    const res = await apiRequest<{ success: boolean; message: string; user?: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      return {
        data: {
          success: true,
          message: 'Alamat emel berjaya disahkan.',
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
    const res = await apiRequest<{ token: string; user: User; expiresAt: number; verificationToken?: string; email?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: cleanUser, password }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      // Standalone / Cloudflare Pages client-side mode
      const localUsers = getLocalUsers();
      const match = localUsers.find(
        (u) => (u.user.username.toLowerCase() === cleanUser || u.user.email.toLowerCase() === cleanUser) &&
               u.passwordHash === password
      );

      if (match) {
        const token = 'token_local_' + Date.now();
        setStoredToken(token);
        setStoredUser(match.user);
        return {
          data: {
            token,
            user: match.user,
            expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          }
        };
      } else {
        return {
          error: 'Nama pengguna atau kata laluan tidak tepat.',
          code: 'INVALID_CREDENTIALS'
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
      return { error: 'Tiada sesi tempatan dijumpai.', code: 'NO_SESSION' };
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

    if (res.code === 'BACKEND_UNAVAILABLE') {
      const current = getStoredUser();
      if (current) {
        const updated: User = {
          ...current,
          name: name.trim() || current.name,
          username: username.trim().toLowerCase() || current.username,
          avatar: avatar || current.avatar,
        };
        setStoredUser(updated);
        const localUsers = getLocalUsers().map((u) => u.user.id === current.id ? { ...u, user: updated } : u);
        saveLocalUsers(localUsers);
        return { data: { user: updated, message: 'Profil berjaya dikemaskini.' } };
      }
    }

    if (res.data?.user) {
      setStoredUser(res.data.user);
    }
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await apiRequest<{ message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.code === 'BACKEND_UNAVAILABLE') {
      const current = getStoredUser();
      if (current) {
        const localUsers = getLocalUsers();
        const idx = localUsers.findIndex((u) => u.user.id === current.id);
        if (idx !== -1) {
          if (localUsers[idx].passwordHash !== currentPassword) {
            return { error: 'Kata laluan semasa tidak tepat.' };
          }
          localUsers[idx].passwordHash = newPassword;
          saveLocalUsers(localUsers);
          return { data: { message: 'Kata laluan berjaya ditukar.' } };
        }
      }
    }

    return res;
  },
};

// Admin API calls
export const adminApi = {
  async getUsers() {
    const res = await apiRequest<{ users: AdminUserItem[] }>('/api/admin/users');
    if (res.code === 'BACKEND_UNAVAILABLE') {
      const localUsers = getLocalUsers();
      const mapped: AdminUserItem[] = localUsers.map((u) => ({
        id: u.user.id,
        username: u.user.username,
        name: u.user.name,
        email: u.user.email,
        email_verified: u.user.email_verified,
        role: u.user.role,
        status: u.user.status,
        avatar: u.user.avatar,
        created_at: u.user.created_at,
        last_login: u.user.last_login || u.user.created_at,
        target_days: getQadaRecord()?.total_required || 0,
        completed_days: getDailyRecords().reduce((sum, r) => sum + (Number(r.days) || 0), 0),
      }));
      return { data: { users: mapped } };
    }
    return res;
  },

  async verifyUserEmail(userId: string) {
    return apiRequest<{ user: any; message: string }>(`/api/admin/users/${userId}/verify-email`, {
      method: 'POST',
    });
  },

  async updateUserStatus(userId: string, status: 'pending' | 'approved' | 'rejected') {
    return apiRequest<{ user: any; message: string }>(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async resetUserPassword(userId: string) {
    return apiRequest<{ success: boolean; defaultPassword: string; message: string; user?: any }>(
      `/api/admin/users/${userId}/reset-password`,
      {
        method: 'POST',
      }
    );
  },

  async deleteUser(userId: string) {
    return apiRequest<{ success?: boolean; message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
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


// Qada Data API calls (all authenticated)
export const qadaApi = {
  async getData() {
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
    return apiRequest('/api/qada/target', {
      method: 'POST',
      body: JSON.stringify({ qada }),
    });
  },

  async saveRecords(records: DailyRecord[]) {
    saveDailyRecords(records);
    return apiRequest('/api/qada/records', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  async saveSettings(settings: UserSettings) {
    saveSettings(settings);
    return apiRequest('/api/qada/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  },

  async resetData() {
    return apiRequest('/api/qada/reset', {
      method: 'POST',
    });
  },
};

