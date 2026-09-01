import { QadaRecord, DailyRecord, UserSettings, User } from '../types';

const STORAGE_KEY_USER = 'qadatrack_user_v1';
const STORAGE_KEY_QADA = 'qadatrack_qada_v1';
const STORAGE_KEY_RECORDS = 'qadatrack_records_v1';
const STORAGE_KEY_SETTINGS = 'qadatrack_settings_v1';

export function getInitialUser(): User {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load user', e);
  }
  const defaultUser: User = {
    id: 'user_' + Date.now(),
    username: 'pengguna',
    name: 'Pengguna KiraPuasaKu',
    email: 'pengguna@example.com',
    email_verified: true,
    role: 'user',
    status: 'approved',
    created_at: new Date().toISOString(),
  };
  saveUser(defaultUser);
  return defaultUser;
}

export function saveUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user', e);
  }
}

export function getInitialSettings(userId?: string): UserSettings {
  try {
    if (userId) {
      const userRaw = localStorage.getItem(`${STORAGE_KEY_SETTINGS}_${userId}`);
      if (userRaw) return JSON.parse(userRaw);
    }
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return {
    theme: 'light',
    language: 'ms',
    userName: 'Pengguna',
    reminder: {
      id: 'rem_' + (userId || '1'),
      user_id: userId || 'user_1',
      enabled: false,
      days: [1, 4], // Monday (1) & Thursday (4) Sunnah
      time: '20:00',
      message: 'Jangan lupa rekod puasa ganti anda hari ini jika telah selesai.',
      created_at: new Date().toISOString(),
    }
  };
}

export function saveSettings(settings: UserSettings, userId?: string): void {
  try {
    const serialized = JSON.stringify(settings);
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY_SETTINGS}_${userId}`, serialized);
    } else {
      localStorage.setItem(STORAGE_KEY_SETTINGS, serialized);
    }
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getQadaRecord(userId?: string): QadaRecord | null {
  try {
    if (userId) {
      const userRaw = localStorage.getItem(`${STORAGE_KEY_QADA}_${userId}`);
      if (userRaw) return JSON.parse(userRaw);
      return null;
    }
    // Without specific userId, do not leak previous user's data
    return null;
  } catch (e) {
    console.error('Failed to load qada target', e);
  }
  return null;
}

export function saveQadaRecord(qada: QadaRecord | null, userId?: string): void {
  try {
    if (!qada) {
      if (userId) {
        localStorage.removeItem(`${STORAGE_KEY_QADA}_${userId}`);
      }
      localStorage.removeItem(STORAGE_KEY_QADA);
      return;
    }
    const serialized = JSON.stringify(qada);
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY_QADA}_${userId}`, serialized);
    }
    localStorage.setItem(STORAGE_KEY_QADA, serialized);
  } catch (e) {
    console.error('Failed to save qada target', e);
  }
}

export function getDailyRecords(userId?: string): DailyRecord[] {
  try {
    if (userId) {
      const userRaw = localStorage.getItem(`${STORAGE_KEY_RECORDS}_${userId}`);
      if (userRaw) {
        const records: DailyRecord[] = JSON.parse(userRaw);
        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return [];
    }
    return [];
  } catch (e) {
    console.error('Failed to load daily records', e);
  }
  return [];
}

export function saveDailyRecords(records: DailyRecord[], userId?: string): void {
  try {
    const serialized = JSON.stringify(records || []);
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY_RECORDS}_${userId}`, serialized);
    }
    localStorage.setItem(STORAGE_KEY_RECORDS, serialized);
  } catch (e) {
    console.error('Failed to save daily records', e);
  }
}

// Compute dynamic totals safely
export function calculateQadaStats(qada: QadaRecord | null, records: DailyRecord[]) {
  if (!qada) {
    return {
      totalRequired: 0,
      totalCompleted: 0,
      remaining: 0,
      progressPercent: 0,
      isCompleted: false,
      totalRecordsCount: 0
    };
  }

  const totalRequired = Math.max(0, qada.total_required);
  const totalCompleted = records.reduce((sum, r) => sum + (Number(r.days) || 0), 0);
  const remaining = Math.max(0, totalRequired - totalCompleted);
  const progressPercent = totalRequired > 0 
    ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100))
    : 0;
  const isCompleted = totalRequired > 0 && totalCompleted >= totalRequired;

  return {
    totalRequired,
    totalCompleted,
    remaining,
    progressPercent,
    isCompleted,
    totalRecordsCount: records.length
  };
}

export function exportAllDataAsJSON(): string {
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    user: getInitialUser(),
    qada: getQadaRecord(),
    records: getDailyRecords(),
    settings: getInitialSettings()
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.qada) saveQadaRecord(data.qada);
    if (data.records && Array.isArray(data.records)) saveDailyRecords(data.records);
    if (data.settings) saveSettings(data.settings);
    if (data.user) saveUser(data.user);
    return true;
  } catch (e) {
    console.error('Failed to import JSON data', e);
    return false;
  }
}

export function resetAllData(userId?: string): void {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_QADA);
  localStorage.removeItem(STORAGE_KEY_RECORDS);
  localStorage.removeItem(STORAGE_KEY_SETTINGS);
  if (userId) {
    localStorage.removeItem(`${STORAGE_KEY_QADA}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEY_RECORDS}_${userId}`);
    localStorage.removeItem(`${STORAGE_KEY_SETTINGS}_${userId}`);
  }
}
