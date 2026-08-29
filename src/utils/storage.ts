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

export function getInitialSettings(): UserSettings {
  try {
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
      id: 'rem_1',
      user_id: 'user_1',
      enabled: false,
      days: [1, 4], // Monday (1) & Thursday (4) Sunnah
      time: '20:00',
      message: 'Jangan lupa rekod puasa ganti anda hari ini jika telah selesai.',
      created_at: new Date().toISOString(),
    }
  };
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function getQadaRecord(): QadaRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QADA);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load qada target', e);
  }
  return null;
}

export function saveQadaRecord(qada: QadaRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY_QADA, JSON.stringify(qada));
  } catch (e) {
    console.error('Failed to save qada target', e);
  }
}

export function getDailyRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (raw) {
      const records: DailyRecord[] = JSON.parse(raw);
      // Sort newest first by date and created_at
      return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  } catch (e) {
    console.error('Failed to load daily records', e);
  }
  return [];
}

export function saveDailyRecords(records: DailyRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
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

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_QADA);
  localStorage.removeItem(STORAGE_KEY_RECORDS);
  localStorage.removeItem(STORAGE_KEY_SETTINGS);
}
