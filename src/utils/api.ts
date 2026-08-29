import { User, QadaRecord, DailyRecord, UserSettings, AdminUserItem } from '../types';

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
    console.error(`API Error on ${endpoint}:`, err);
    return { error: 'Gagal menyambung ke pelayan backend. Sila pastikan pelayan sedang aktif.' };
  }
}

// Authentication API calls
export const authApi = {
  async register(username: string, email: string, password: string, avatar?: string, name?: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      requiresEmailVerification: boolean;
      email: string;
      username: string;
      verificationToken: string;
      user: User;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, avatar, name }),
    });
  },

  async verifyEmail(token: string, email?: string) {
    return apiRequest<{ success: boolean; message: string; user?: User }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    });
  },

  async resendVerification(email?: string, username?: string) {
    return apiRequest<{ success: boolean; message: string; email?: string; verificationToken?: string; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  },

  async login(username: string, password: string) {
    const res = await apiRequest<{ token: string; user: User; expiresAt: number; verificationToken?: string; email?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
    }

    return res;
  },

  async getMe() {
    const res = await apiRequest<{ user: User; session: { expiresAt: number; remainingMinutes: number } }>('/api/auth/me');
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
    if (res.data?.user) {
      setStoredUser(res.data.user);
    }
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiRequest<{ message: string }>('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Admin API calls
export const adminApi = {
  async getUsers() {
    return apiRequest<{ users: AdminUserItem[] }>('/api/admin/users');
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
};

// Qada Data API calls (all authenticated)
export const qadaApi = {
  async getData() {
    return apiRequest<{ qada: QadaRecord | null; records: DailyRecord[]; settings: UserSettings }>('/api/qada/data');
  },

  async saveTarget(qada: QadaRecord) {
    return apiRequest('/api/qada/target', {
      method: 'POST',
      body: JSON.stringify({ qada }),
    });
  },

  async saveRecords(records: DailyRecord[]) {
    return apiRequest('/api/qada/records', {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  async saveSettings(settings: UserSettings) {
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
