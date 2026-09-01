export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  registration_code?: string;
  registration_code_used?: boolean;
  code_type?: 'registration' | 'access';
  created_at: string;
  last_login?: string;
}

export interface AdminUserItem {
  id: string;
  username: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  registration_code?: string;
  registration_code_used?: boolean;
  code_type?: 'registration' | 'access';
  created_at: string;
  last_login?: string;
  qadaRequired?: number;
  qadaCompleted?: number;
  recordsCount?: number;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface QadaRecord {
  id: string;
  user_id: string;
  total_required: number;
  total_completed: number;
  remaining: number;
  year?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  qada_record_id: string;
  date: string; // Format: YYYY-MM-DD
  days: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderConfig {
  id: string;
  user_id: string;
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday (Isnin), 4 = Thursday (Khamis), etc.
  time: string; // Format: "20:00"
  message?: string;
  created_at: string;
}

export type Language = 'ms' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  theme: ThemeMode;
  language: Language;
  userName: string;
  reminder: ReminderConfig;
  googleSheetWebhookUrl?: string;
  lastGoogleSheetSync?: string;
}

export type NavigationTab = 'dashboard' | 'record' | 'calendar' | 'progress' | 'history' | 'settings';
