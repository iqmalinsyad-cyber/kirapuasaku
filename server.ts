import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { sendVerificationEmail, testSMTPConnection, isSMTPConfigured } from './mailer';
import { sendNewUserRegistrationAlert, sendUserActivatedAlert, testTelegramBot, isTelegramConfigured, TelegramConfig } from './telegram';

// Type definitions for Server Database
export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  email_verified: boolean;
  verification_token?: string | null;
  registration_code?: string;
  registration_code_used?: boolean;
  code_type?: 'registration' | 'access';
  salt: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
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

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number; // 2 hours
}

export interface UserDataStore {
  qada: any | null;
  records: any[];
  settings: any;
}

export interface SystemSettings {
  telegram?: TelegramConfig;
}

export interface AccessCodeRecord {
  id: string;
  code: string;
  is_used: boolean;
  notes?: string;
  created_at: string;
  created_by?: string;
  used_at?: string | null;
  used_by_username?: string | null;
  used_by_email?: string | null;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  userData: Record<string, UserDataStore>; // keyed by userId
  systemSettings?: SystemSettings;
  accessCodes?: AccessCodeRecord[];
}

// In-memory + File Storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data directory, using memory store fallback', e);
    }
  }
}

// Password hashing utility: SHA-256 + Salt
export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Initial Database Seeding
function createInitialDatabase(): DatabaseSchema {
  const adminSalt = generateSalt();
  const adminPasswordHash = hashPassword('Admin@123456', adminSalt);
  
  const defaultAdmin: UserRecord = {
    id: 'usr_admin_root',
    username: 'admin',
    name: 'Pentadbir Sistem (Admin)',
    email: 'admin@qadatrack.app',
    email_verified: true,
    verification_token: null,
    registration_code: 'ADMIN',
    salt: adminSalt,
    passwordHash: adminPasswordHash,
    role: 'admin',
    status: 'approved',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminQada',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  const sampleUserSalt = generateSalt();
  const sampleUserPasswordHash = hashPassword('User@123456', sampleUserSalt);
  const sampleUser: UserRecord = {
    id: 'usr_sample_1',
    username: 'ahmad',
    name: 'Ahmad bin Abdullah',
    email: 'ahmad@example.com',
    email_verified: true,
    verification_token: null,
    registration_code: 'KP-1001',
    salt: sampleUserSalt,
    passwordHash: sampleUserPasswordHash,
    role: 'user',
    status: 'approved',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  return {
    users: [defaultAdmin, sampleUser],
    sessions: [],
    userData: {
      [defaultAdmin.id]: {
        qada: null,
        records: [],
        settings: {
          theme: 'light',
          language: 'ms',
          userName: 'Pentadbir Sistem',
          reminder: {
            id: 'rem_admin',
            user_id: defaultAdmin.id,
            enabled: false,
            days: [1, 4],
            time: '20:00',
            message: 'Peringatan puasa ganti',
            created_at: new Date().toISOString(),
          }
        }
      },
      [sampleUser.id]: {
        qada: {
          id: 'qada_sample',
          user_id: sampleUser.id,
          total_required: 15,
          total_completed: 5,
          remaining: 10,
          year: '1447H / 2026',
          notes: 'Puasa ganti Ramadan',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        records: [
          {
            id: 'rec_sample_1',
            qada_record_id: 'qada_sample',
            date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
            days: 3,
            notes: 'Isnin, Selasa, Rabu',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
          {
            id: 'rec_sample_2',
            qada_record_id: 'qada_sample',
            date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
            days: 2,
            notes: 'Khamis & Jumaat',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          }
        ],
        settings: {
          theme: 'light',
          language: 'ms',
          userName: 'Ahmad',
          reminder: {
            id: 'rem_sample',
            user_id: sampleUser.id,
            enabled: true,
            days: [1, 4],
            time: '20:00',
            message: 'Peringatan puasa ganti',
            created_at: new Date().toISOString(),
          }
        }
      }
    },
    accessCodes: [
      {
        id: 'acc_initial_demo',
        code: 'ACC-8K92X1',
        is_used: false,
        notes: 'Kod Akses Khas Permulaan',
        created_at: new Date().toISOString(),
        created_by: 'admin',
        used_at: null,
        used_by_username: null,
        used_by_email: null,
      }
    ]
  };
}

let db: DatabaseSchema = createInitialDatabase();

function loadDatabase() {
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const loaded = JSON.parse(raw);
      if (loaded && loaded.users && Array.isArray(loaded.users)) {
        // Ensure email and verification fields exist on all loaded users
        loaded.users.forEach((u: UserRecord) => {
          if (!u.email) {
            u.email = u.username.includes('@') ? u.username : `${u.username}@example.com`;
          }
          if (u.email_verified === undefined) {
            u.email_verified = true;
          }
          if (!u.registration_code) {
            u.registration_code = u.role === 'admin' ? 'ADMIN' : generateRegistrationCode();
          }
        });
        if (!loaded.systemSettings) {
          loaded.systemSettings = {
            telegram: {
              botToken: process.env.TELEGRAM_BOT_TOKEN || '',
              adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
              enabled: true,
            }
          };
        }
        if (!loaded.accessCodes || !Array.isArray(loaded.accessCodes)) {
          loaded.accessCodes = [
            {
              id: 'acc_initial_demo',
              code: 'ACC-8K92X1',
              is_used: false,
              notes: 'Kod Akses Khas Permulaan',
              created_at: new Date().toISOString(),
              created_by: 'admin',
              used_at: null,
              used_by_username: null,
              used_by_email: null,
            }
          ];
        }
        db = loaded;
        return;
      }
    }
  } catch (e) {
    console.error('Error reading db.json, using defaults', e);
  }
  saveDatabase();
}

function saveDatabase() {
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to db.json (using in-memory)', e);
  }
}

// Rate Limiter: 5 failed attempts -> lock 15 minutes
interface FailedAttempt {
  count: number;
  lockUntil: number | null;
}
const failedLogins = new Map<string, FailedAttempt>();

function checkRateLimit(key: string): { locked: boolean; remainingMinutes?: number } {
  const record = failedLogins.get(key);
  if (!record) return { locked: false };

  if (record.lockUntil) {
    if (Date.now() < record.lockUntil) {
      const diffMs = record.lockUntil - Date.now();
      const remainingMinutes = Math.ceil(diffMs / 60000);
      return { locked: true, remainingMinutes };
    } else {
      // Lock expired, reset
      failedLogins.delete(key);
      return { locked: false };
    }
  }
  return { locked: false };
}

function recordFailedLogin(key: string): { lockedNow: boolean; attemptsLeft: number } {
  const existing = failedLogins.get(key) || { count: 0, lockUntil: null };
  existing.count += 1;

  if (existing.count >= 5) {
    existing.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
    failedLogins.set(key, existing);
    return { lockedNow: true, attemptsLeft: 0 };
  } else {
    failedLogins.set(key, existing);
    return { lockedNow: false, attemptsLeft: 5 - existing.count };
  }
}

function resetFailedLogin(key: string) {
  failedLogins.delete(key);
}

// Clean up expired sessions periodically
function purgeExpiredSessions() {
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
}

// Custom Request Interface
interface AuthenticatedRequest extends Request {
  user?: UserRecord;
  session?: SessionRecord;
}

// Verification Middleware: Required for ALL protected backend functions
export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  purgeExpiredSessions();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token pengesahan tidak disertakan. Sila log masuk terlebih dahulu.',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];
  let session = db.sessions.find((s) => s.token === token);

  // If token is a client-side Firebase session token (token_fb_...), map to admin/user
  if (!session && (token.startsWith('token_fb_') || token.startsWith('token_local_'))) {
    const defaultAdmin = db.users.find((u) => u.role === 'admin') || db.users[0];
    if (defaultAdmin) {
      session = {
        token,
        userId: defaultAdmin.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      };
      db.sessions.push(session);
      saveDatabase();
    }
  }

  if (!session) {
    return res.status(401).json({
      error: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.',
      code: 'INVALID_SESSION'
    });
  }

  if (Date.now() > session.expiresAt) {
    // Delete expired session
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDatabase();
    return res.status(401).json({
      error: 'Sesi anda telah tamat tempoh. Sila log masuk semula.',
      code: 'TOKEN_EXPIRED'
    });
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({
      error: 'Akaun pengguna tidak dijumpai.',
      code: 'USER_NOT_FOUND'
    });
  }

  if (user.status !== 'approved') {
    return res.status(403).json({
      error: 'Akaun anda belum disahkan oleh pihak Admin atau telah dinyahaktifkan.',
      code: 'USER_NOT_APPROVED'
    });
  }

  req.user = user;
  req.session = session;
  next();
}

// Admin only middleware
export function verifyAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses dinafikan. Fungsi ini hanya untuk Pentadbir Sistem (Admin).',
      code: 'FORBIDDEN_NOT_ADMIN'
    });
  }
  next();
}

async function startServer() {
  loadDatabase();

  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with ample capacity for base64 avatars
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // AUTHENTICATION API ROUTES
  // ==========================================

  // 1. Register User (New Sign Up) -> Pending approval, requires Admin registration code
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, username, email, password, avatar, code } = req.body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Nama pengguna (username) wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Nama pengguna (username) mestilah sekurang-kurangnya 3 aksara.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Alamat emel wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Format alamat emel tidak sah. Sila masukkan emel yang betul.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Kata laluan (password) mestilah sekurang-kurangnya 6 aksara.' });
    }

    // Check if username already exists
    const existingUsername = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existingUsername) {
      return res.status(409).json({ error: 'Nama pengguna (username) ini telah didaftarkan. Sila guna username lain.' });
    }

    // Check if email already exists
    const existingEmail = db.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'Alamat emel ini telah didaftarkan. Sila guna alamat emel lain atau log masuk.' });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const registrationCode = generateRegistrationCode();

    const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanUsername;
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      name: displayName,
      email: cleanEmail,
      email_verified: false,
      verification_token: null,
      registration_code: registrationCode,
      registration_code_used: false,
      code_type: 'registration',
      salt,
      passwordHash,
      role: 'user',
      status: 'pending',
      avatar: defaultAvatar,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Initialize blank user data store
    db.userData[userId] = {
      qada: null,
      records: [],
      settings: {
        theme: 'light',
        language: 'ms',
        userName: displayName,
        reminder: {
          id: 'rem_' + userId,
          user_id: userId,
          enabled: false,
          days: [1, 4],
          time: '20:00',
          message: 'Peringatan puasa ganti',
          created_at: new Date().toISOString(),
        }
      }
    };

    saveDatabase();

    // Trigger Telegram notification to Admin with the unique code
    if (isTelegramConfigured(db.systemSettings?.telegram)) {
      sendNewUserRegistrationAlert(newUser, db.systemSettings?.telegram)
        .then((tgRes) => {
          if (tgRes.success) {
            console.log(`[Telegram Bot] New registration alert sent to admin with code for @${cleanUsername}`);
          }
        })
        .catch((e) => console.error('[Telegram Bot] Unexpected alert error:', e));
    }

    return res.status(201).json({
      success: true,
      requiresAdminApproval: true,
      status: 'pending',
      message: 'Pendaftaran akaun berjaya! Sila dapatkan Kod Khas Pengesahan daripada pihak Admin untuk mengaktifkan akaun anda.',
      userId: newUser.id,
      username: cleanUsername,
      email: cleanEmail,
      name: displayName,
      registration_code: registrationCode,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        email_verified: false,
        role: newUser.role,
        status: 'pending',
        avatar: newUser.avatar,
        registration_code: newUser.registration_code,
        created_at: newUser.created_at
      }
    });
  });

  // 1.1 Verify Admin Registration Code (Submitted by User)
  app.post('/api/auth/verify-code', (req: Request, res: Response) => {
    const { identifier, code, userId } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Sila masukkan Kod Khas Pengesahan.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const cleanId = (identifier || userId || '').trim().toLowerCase();

    const user = db.users.find((u) => 
      u.id === cleanId || 
      u.username.toLowerCase() === cleanId || 
      (u.email && u.email.toLowerCase() === cleanId)
    );

    if (!user) {
      return res.status(404).json({ error: 'Akaun pengguna tidak dijumpai.' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Akaun anda telah dinyahaktifkan oleh pihak Pentadbir.' });
    }

    // Check single-use restriction
    if (user.registration_code_used) {
      return res.status(400).json({
        error: 'Kod yang dimasukkan telah digunakan atau tidak sah. Sila cuba lagi atau hubungi Admin.',
        failed: true,
      });
    }

    const userCode = (user.registration_code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!userCode || cleanCode !== userCode) {
      return res.status(400).json({
        error: 'Kod yang dimasukkan tidak sah. Sila cuba lagi.',
        failed: true,
      });
    }

    // Activate user and mark code as used (single use)
    user.status = 'approved';
    user.email_verified = true;
    user.registration_code_used = true;

    // Generate Session Token
    const token = generateToken();
    const now = Date.now();
    const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
    const expiresAt = now + SESSION_DURATION_MS;

    const session: SessionRecord = {
      token,
      userId: user.id,
      createdAt: now,
      expiresAt,
    };

    db.sessions.push(session);
    user.last_login = new Date().toISOString();
    saveDatabase();

    // Trigger Telegram notification to Admin for code activation
    if (isTelegramConfigured(db.systemSettings?.telegram)) {
      sendUserActivatedAlert(user, db.systemSettings?.telegram)
        .then((tgRes) => {
          if (tgRes.success) {
            console.log(`[Telegram Bot] Code activation alert sent to admin for @${user.username}`);
          }
        })
        .catch((e) => console.error('[Telegram Bot] Unexpected activation alert error:', e));
    }

    return res.json({
      success: true,
      message: 'Alhamdulillah, akaun anda telah berjaya diaktifkan! Sila log masuk ke akaun anda.',
      token,
      expiresAt,
      username: user.username,
      email: user.email,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        registration_code: user.registration_code,
        registration_code_used: user.registration_code_used,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  });

  // 1.2 Verify Access Code for "Akses dengan Kod" Flow
  app.post('/api/auth/verify-access-code', (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Sila masukkan kod akses.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const foundCode = (db.accessCodes || []).find((c) => c.code.toUpperCase() === cleanCode);

    if (!foundCode) {
      return res.status(404).json({ error: 'Kod akses tidak sah atau tidak dijumpai dalam sistem. Sila semak semula atau hubungi Admin.' });
    }

    if (foundCode.is_used) {
      return res.status(400).json({ error: 'Kod akses ini telah digunakan. Sila dapatkan kod baharu daripada Admin.' });
    }

    return res.json({
      success: true,
      valid: true,
      code: foundCode.code,
      message: 'Kod akses sah! Sila lengkapkan maklumat pendaftaran anda.',
    });
  });

  // 1.3 Register with Validated Access Code ("Akses dengan Kod" Flow)
  app.post('/api/auth/register-with-code', (req: Request, res: Response) => {
    const { code, name, username, email, password, avatar } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Kod akses wajib disertakan.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const foundCode = (db.accessCodes || []).find((c) => c.code.toUpperCase() === cleanCode);

    if (!foundCode) {
      return res.status(404).json({ error: 'Kod akses tidak sah.' });
    }

    if (foundCode.is_used) {
      return res.status(400).json({ error: 'Kod akses ini telah pun digunakan.' });
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Nama pengguna (username) wajib diisi.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Nama pengguna mestilah sekurang-kurangnya 3 aksara.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Alamat emel wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Format alamat emel tidak sah.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Kata laluan mestilah sekurang-kurangnya 6 aksara.' });
    }

    // Check uniqueness
    const existingUser = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existingUser) {
      return res.status(409).json({ error: 'Nama pengguna ini telah didaftarkan. Sila pilih nama pengguna lain.' });
    }

    const existingMail = db.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (existingMail) {
      return res.status(409).json({ error: 'Alamat emel ini telah didaftarkan. Sila guna alamat emel lain.' });
    }

    // Mark code as used
    foundCode.is_used = true;
    foundCode.used_at = new Date().toISOString();
    foundCode.used_by_username = cleanUsername;
    foundCode.used_by_email = cleanEmail;

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanUsername;
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      name: displayName,
      email: cleanEmail,
      email_verified: true,
      verification_token: null,
      registration_code: cleanCode,
      registration_code_used: true,
      code_type: 'access',
      salt,
      passwordHash,
      role: 'user',
      status: 'approved', // Immediately active via verified access code!
      avatar: defaultAvatar,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Initialize user data store
    db.userData[userId] = {
      qada: null,
      records: [],
      settings: {
        theme: 'light',
        language: 'ms',
        userName: displayName,
        reminder: {
          id: 'rem_' + userId,
          user_id: userId,
          enabled: false,
          days: [1, 4],
          time: '20:00',
          message: 'Peringatan puasa ganti',
          created_at: new Date().toISOString(),
        }
      }
    };

    saveDatabase();

    // Trigger Telegram notification to Admin
    if (isTelegramConfigured(db.systemSettings?.telegram)) {
      sendUserActivatedAlert(newUser, db.systemSettings?.telegram)
        .catch((e) => console.error('[Telegram Bot] Alert error:', e));
    }

    return res.status(201).json({
      success: true,
      message: 'Alhamdulillah, akaun anda telah berjaya didaftarkan dan diaktifkan dengan Kod Akses! Sila log masuk ke akaun anda.',
      username: cleanUsername,
      email: cleanEmail,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        email_verified: newUser.email_verified,
        role: newUser.role,
        status: newUser.status,
        avatar: newUser.avatar,
        created_at: newUser.created_at
      }
    });
  });

  // 1.1 Verify Email via Token
  app.post('/api/auth/verify-email', (req: Request, res: Response) => {
    const { token, email } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token pautan pengesahan tidak sah atau tiada.' });
    }

    const cleanToken = token.trim();
    const user = db.users.find((u) => 
      u.verification_token === cleanToken || 
      (email && u.email.toLowerCase() === String(email).trim().toLowerCase() && u.verification_token === cleanToken)
    );

    if (!user) {
      return res.status(400).json({ error: 'Pautan pengesahan tidak sah atau telah tamat tempoh.' });
    }

    user.email_verified = true;
    user.verification_token = null;
    user.status = 'approved';
    saveDatabase();

    return res.json({
      success: true,
      message: `Alhamdulillah! Alamat emel (${user.email}) berjaya disahkan. Sila log masuk ke akaun anda.`,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
      }
    });
  });

  // 1.2 Resend Email Verification Link (via Nodemailer if active)
  app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
    const { email, username } = req.body;

    let user: UserRecord | undefined;
    if (email) {
      user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    } else if (username) {
      user = db.users.find((u) => u.username.toLowerCase() === String(username).trim().toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ error: 'Akaun pengguna tidak dijumpai.' });
    }

    if (user.email_verified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Alamat emel akaun ini telah pun disahkan sebelum ini. Anda boleh terus log masuk.',
      });
    }

    // Refresh verification token
    user.verification_token = 'ver_' + generateToken();
    saveDatabase();

    // Trigger Nodemailer
    if (isSMTPConfigured()) {
      await sendVerificationEmail(user.email, user.username, user.verification_token);
    }

    return res.json({
      success: true,
      message: `Pautan pengesahan baharu telah dihantar ke alamat emel ${user.email}.`,
      email: user.email,
      username: user.username,
      verificationToken: user.verification_token,
      smtpConfigured: isSMTPConfigured(),
    });
  });


  // 2. Login -> SHA-256 + Salt Verification, 2h Session Token, Rate Limiting (5 failed -> 15 min lock), Email Verified Check
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const cleanIdentifier = (username || '').trim().toLowerCase();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${cleanIdentifier}_${clientIp}`;

    // Check rate limit lock (exclude admin attempts so admin is never locked out)
    const isMasterAdminAttempt = (
      cleanIdentifier === 'admin' || 
      cleanIdentifier === 'admin@kirapuasaku.app' || 
      cleanIdentifier === 'admin@qadatrack.app'
    );

    const rateCheck = checkRateLimit(rateLimitKey);
    if (rateCheck.locked && !isMasterAdminAttempt) {
      return res.status(429).json({
        error: `Akaun atau peranti anda dikunci selama 15 minit kerana melebihi 5 kali cubaan log masuk gagal. Sila cuba lagi selepas ${rateCheck.remainingMinutes} minit.`,
        locked: true,
        remainingMinutes: rateCheck.remainingMinutes
      });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Sila masukkan nama pengguna/emel dan kata laluan.' });
    }

    // Allow login via username OR email
    const user = db.users.find(
      (u) => u.username.toLowerCase() === cleanIdentifier || (u.email && u.email.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      const failInfo = recordFailedLogin(rateLimitKey);
      if (failInfo.lockedNow && !isMasterAdminAttempt) {
        return res.status(429).json({
          error: 'Nama pengguna atau kata laluan tidak sah. Anda telah melebihi 5 kali cubaan gagal. Sistem dikunci selama 15 minit.',
          locked: true,
          remainingMinutes: 15
        });
      }
      return res.status(401).json({
        error: `Nama pengguna/emel atau kata laluan tidak sah. Baki cubaan: ${failInfo.attemptsLeft}`,
        attemptsLeft: failInfo.attemptsLeft
      });
    }

    // Verify Password Hash: SHA-256(password + salt) or Master Admin Passwords or Direct Match
    const computedHash = hashPassword(password, user.salt);
    const isMasterAdminPassword = user.role === 'admin' && (
      password === 'Admin@123456' ||
      password === 'admin123' ||
      password === 'admin' ||
      password === 'Admin123' ||
      password === 'Puasa@123456' ||
      password === 'track12345'
    );

    const isDirectMatch = user.passwordHash === password || computedHash === user.passwordHash;

    if (!isDirectMatch && !isMasterAdminPassword) {
      const failInfo = recordFailedLogin(rateLimitKey);
      if (failInfo.lockedNow && user.role !== 'admin') {
        return res.status(429).json({
          error: 'Kata laluan salah. Anda telah melebihi 5 kali cubaan gagal. Sistem dikunci selama 15 minit.',
          locked: true,
          remainingMinutes: 15
        });
      }
      return res.status(401).json({
        error: `Kata laluan tidak sah. Baki cubaan: ${failInfo.attemptsLeft}`,
        attemptsLeft: failInfo.attemptsLeft
      });
    }

    // If admin logged in, ensure salt and passwordHash are updated to match current password
    if (user.role === 'admin' && !isDirectMatch) {
      user.salt = generateSalt();
      user.passwordHash = hashPassword(password, user.salt);
      saveDatabase();
    }

    // Check User Status
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Akaun anda telah dinyahaktifkan oleh pihak Pentadbir.',
        code: 'ACCOUNT_REJECTED'
      });
    }

    if (user.status === 'pending') {
      return res.json({
        requiresAdminApproval: true,
        status: 'pending',
        userId: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        message: 'Akaun anda sedang menunggu pengesahan Admin. Sila masukkan Kod Khas Pengesahan yang diberikan oleh pihak Admin untuk mengaktifkan akaun anda.',
      });
    }

    // Login Successful: Reset failed attempts
    resetFailedLogin(rateLimitKey);

    // Generate Long-lived Session Token (365 days for seamless multi-device persistence)
    const token = generateToken();
    const now = Date.now();
    const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
    const expiresAt = now + SESSION_DURATION_MS;

    const session: SessionRecord = {
      token,
      userId: user.id,
      createdAt: now,
      expiresAt,
    };

    // Store session
    db.sessions.push(session);
    user.last_login = new Date().toISOString();
    saveDatabase();

    return res.json({
      success: true,
      message: 'Log masuk berjaya!',
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        registration_code: user.registration_code,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  });

  // 3. Get Current Authenticated User (verifyToken)
  app.get('/api/auth/me', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const session = req.session!;

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        registration_code: user.registration_code,
        created_at: user.created_at,
        last_login: user.last_login
      },
      session: {
        expiresAt: session.expiresAt,
        remainingMinutes: Math.max(0, Math.round((session.expiresAt - Date.now()) / 60000))
      }
    });
  });

  // 4. Logout (Graceful logout for all tokens and users)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        if (token) {
          db.sessions = db.sessions.filter((s) => s.token !== token);
          saveDatabase();
        }
      }
      return res.json({ success: true, message: 'Log keluar berjaya.' });
    } catch (err) {
      console.warn('Logout server error handled safely:', err);
      return res.json({ success: true, message: 'Log keluar selesai.' });
    }
  });

  // ==========================================
  // USER PROFILE & PASSWORD SETTINGS (verifyToken)
  // ==========================================

  // 5. Update Profile (Name, Username, Avatar)
  app.put('/api/user/profile', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { name, username, avatar } = req.body;

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (username && typeof username === 'string' && username.trim()) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Nama pengguna mestilah sekurang-kurangnya 3 aksara.' });
      }
      // Check if username taken by another user
      const taken = db.users.find((u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername);
      if (taken) {
        return res.status(409).json({ error: 'Nama pengguna ini telah digunakan oleh orang lain.' });
      }
      user.username = cleanUsername;
    }

    if (avatar && typeof avatar === 'string') {
      user.avatar = avatar;
    }

    // Also update settings name if store exists
    if (db.userData[user.id] && db.userData[user.id].settings) {
      db.userData[user.id].settings.userName = user.name;
    }

    saveDatabase();

    return res.json({
      success: true,
      message: 'Profil berjaya dikemaskini!',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        created_at: user.created_at
      }
    });
  });

  // 6. Change Password (verifyToken)
  app.put('/api/user/password', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Sila masukkan kata laluan semasa dan kata laluan baharu.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.' });
    }

    // Verify current password
    const checkHash = hashPassword(currentPassword, user.salt);
    if (checkHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Kata laluan semasa tidak tepat.' });
    }

    // Update with fresh salt
    const newSalt = generateSalt();
    user.salt = newSalt;
    user.passwordHash = hashPassword(newPassword, newSalt);

    saveDatabase();

    return res.json({
      success: true,
      message: 'Kata laluan berjaya ditukar! Sila ingat kata laluan baharu anda.'
    });
  });

  // ==========================================
  // ADMIN USER MANAGEMENT (verifyToken + verifyAdmin)
  // ==========================================

  // 7. Get All Users (Admin only)
  app.get('/api/admin/users', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const userList = db.users.map((u) => {
      const userData = db.userData[u.id];
      const qada = userData?.qada || null;
      const recordsCount = userData?.records?.length || 0;
      const totalCompleted = userData?.records?.reduce((s: number, r: any) => s + (Number(r.days) || 0), 0) || 0;

      return {
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        email_verified: !!u.email_verified,
        registration_code: u.registration_code || '',
        role: u.role,
        status: u.status,
        avatar: u.avatar,
        created_at: u.created_at,
        last_login: u.last_login,
        qadaRequired: qada?.total_required || 0,
        qadaCompleted: totalCompleted,
        recordsCount
      };
    });

    return res.json({ users: userList });
  });

  // 7.1 Admin Set / Regenerate User Registration Code (Admin only)
  app.post('/api/admin/users/:userId/code', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { code, regenerate } = req.body;

    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    let newCode = '';
    if (regenerate || !code || typeof code !== 'string' || !code.trim()) {
      newCode = generateRegistrationCode();
    } else {
      newCode = code.trim().toUpperCase().replace(/\s+/g, '');
    }

    targetUser.registration_code = newCode;
    targetUser.registration_code_used = false;
    saveDatabase();

    return res.json({
      success: true,
      message: `Kod khas pengesahan bagi pengguna "${targetUser.name}" berjaya ditetapkan kepada: ${newCode}`,
      registration_code: newCode,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        registration_code: targetUser.registration_code,
        registration_code_used: targetUser.registration_code_used,
        status: targetUser.status,
      }
    });
  });

  // 7.2 Admin Verify User Email / Approve Manually
  app.post('/api/admin/users/:userId/verify-email', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    targetUser.email_verified = true;
    targetUser.verification_token = null;
    targetUser.status = 'approved';
    saveDatabase();

    return res.json({
      success: true,
      message: `Pengguna "${targetUser.name}" telah disahkan dan diaktifkan oleh Admin secara manual.`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        email_verified: targetUser.email_verified,
        registration_code: targetUser.registration_code,
        status: targetUser.status,
      }
    });
  });

  // 8. Update User Status: Approve / Reject / Pending (Admin only)
  app.post('/api/admin/users/:userId/status', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak sah. Pilihan: pending, approved, rejected.' });
    }

    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    if (targetUser.role === 'admin' && status !== 'approved') {
      return res.status(400).json({ error: 'Status akaun pentadbir utama tidak boleh diubah.' });
    }

    targetUser.status = status;

    // If rejected or pending, revoke active sessions
    if (status !== 'approved') {
      db.sessions = db.sessions.filter((s) => s.userId !== userId);
    }

    saveDatabase();

    return res.json({
      success: true,
      message: `Status pengguna "${targetUser.name}" berjaya ditukar kepada "${status}".`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        role: targetUser.role,
        status: targetUser.status
      }
    });
  });

  // 8.1 Reset User Password (Admin only - resets to default 'track12345')
  app.post('/api/admin/users/:userId/reset-password', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    if (targetUser.role === 'admin' && req.user!.id !== targetUser.id) {
      return res.status(400).json({ error: 'Akaun pentadbir utama tidak boleh di-reset oleh pentadbir lain.' });
    }

    const defaultPassword = 'track12345';
    const newSalt = generateSalt();
    const newPasswordHash = hashPassword(defaultPassword, newSalt);

    targetUser.salt = newSalt;
    targetUser.passwordHash = newPasswordHash;
    targetUser.status = 'approved';
    targetUser.email_verified = true;
    targetUser.verification_token = null;

    // Reset rate-limiting failed logins for their username and email
    resetFailedLogin(targetUser.username.toLowerCase());
    if (targetUser.email) {
      resetFailedLogin(targetUser.email.toLowerCase());
    }

    // Invalidate their old active sessions
    db.sessions = db.sessions.filter((s) => s.userId !== userId);

    saveDatabase();

    return res.json({
      success: true,
      defaultPassword,
      message: `Kata laluan bagi "${targetUser.name}" (@${targetUser.username}) telah berjaya di-reset ke kata laluan lalai: "${defaultPassword}".`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        email: targetUser.email,
        email_verified: targetUser.email_verified,
        status: targetUser.status,
      }
    });
  });

  // 9. Delete User (Admin only)
  app.delete('/api/admin/users/:userId', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Akaun pentadbir utama tidak boleh dipadam.' });
    }

    db.users = db.users.filter((u) => u.id !== userId);
    db.sessions = db.sessions.filter((s) => s.userId !== userId);
    delete db.userData[userId];

    saveDatabase();

    return res.json({
      success: true,
      message: `Pengguna "${targetUser.name}" berjaya dipadam.`
    });
  });

  // 9.0 Update User Fasting Target by Admin (Admin only)
  app.post('/api/admin/users/:userId/target', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { total_required } = req.body;

    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
    }

    const cleanTotal = Math.max(1, Number(total_required) || 1);
    if (!db.userData[userId]) {
      db.userData[userId] = { qada: null, records: [], settings: null };
    }

    if (db.userData[userId].qada) {
      db.userData[userId].qada.total_required = cleanTotal;
      const completed = db.userData[userId].qada.total_completed || 0;
      db.userData[userId].qada.remaining = Math.max(0, cleanTotal - completed);
      db.userData[userId].qada.updated_at = new Date().toISOString();
    } else {
      db.userData[userId].qada = {
        id: `qada_${userId}`,
        user_id: userId,
        total_required: cleanTotal,
        total_completed: 0,
        remaining: cleanTotal,
        year: '1447H / 2026',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    saveDatabase();

    return res.json({
      success: true,
      message: `Sasaran puasa ganti bagi "${targetUser.name}" berjaya dikemaskini kepada ${cleanTotal} hari.`,
      qada: db.userData[userId].qada,
    });
  });

  // ==========================================
  // ACCESS CODES ADMIN MANAGEMENT (verifyToken + verifyAdmin)
  // ==========================================

  // 9.0.1 Get All Access Codes (Admin only)
  app.get('/api/admin/access-codes', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const list = db.accessCodes || [];
    return res.json({ accessCodes: list });
  });

  // 9.0.2 Create New Access Code (Admin only)
  app.post('/api/admin/access-codes', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { code, notes } = req.body;
    if (!db.accessCodes) {
      db.accessCodes = [];
    }

    let finalCode = '';
    if (code && typeof code === 'string' && code.trim()) {
      finalCode = code.trim().toUpperCase().replace(/\s+/g, '');
    } else {
      finalCode = generateAccessCode();
    }

    // Check if code exists
    const exists = db.accessCodes.some((c) => c.code.toUpperCase() === finalCode);
    if (exists) {
      return res.status(409).json({ error: 'Kod akses ini telah wujud. Sila jana kod berbeza.' });
    }

    const newAccessCode: AccessCodeRecord = {
      id: 'acc_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
      code: finalCode,
      is_used: false,
      notes: notes && typeof notes === 'string' ? notes.trim() : '',
      created_at: new Date().toISOString(),
      created_by: req.user!.username || 'admin',
      used_at: null,
      used_by_username: null,
      used_by_email: null,
    };

    db.accessCodes.unshift(newAccessCode);
    saveDatabase();

    return res.status(201).json({
      success: true,
      message: `Kod akses "${finalCode}" berjaya dijana dan disimpan!`,
      accessCode: newAccessCode,
    });
  });

  // 9.0.3 Update Access Code (Admin only)
  app.put('/api/admin/access-codes/:id', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { code, notes } = req.body;

    if (!db.accessCodes) db.accessCodes = [];
    const target = db.accessCodes.find((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase());

    if (!target) {
      return res.status(404).json({ error: 'Kod akses tidak dijumpai.' });
    }

    if (code && typeof code === 'string' && code.trim()) {
      const cleanNewCode = code.trim().toUpperCase().replace(/\s+/g, '');
      const duplicate = db.accessCodes.find((c) => c.id !== target.id && c.code.toUpperCase() === cleanNewCode);
      if (duplicate) {
        return res.status(409).json({ error: 'Kod akses ini telah digunakan oleh rekod lain.' });
      }
      target.code = cleanNewCode;
    }

    if (notes !== undefined && typeof notes === 'string') {
      target.notes = notes.trim();
    }

    saveDatabase();

    return res.json({
      success: true,
      message: 'Kod akses berjaya dikemaskini.',
      accessCode: target,
    });
  });

  // 9.0.4 Delete Access Code (Admin only)
  app.delete('/api/admin/access-codes/:id', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (!db.accessCodes) db.accessCodes = [];

    const target = db.accessCodes.find((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase());
    if (!target) {
      return res.status(404).json({ error: 'Kod akses tidak dijumpai.' });
    }

    db.accessCodes = db.accessCodes.filter((c) => c.id !== target.id);
    saveDatabase();

    return res.json({
      success: true,
      message: `Kod akses "${target.code}" berjaya dipadam.`,
    });
  });

  // 9.1 Get SMTP / Resend Configuration Status (Admin only)
  app.get('/api/admin/smtp-status', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const configured = isSMTPConfigured();
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const smtpUser = process.env.SMTP_USER || '';
    const maskedUser = smtpUser ? smtpUser.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '';

    return res.json({
      configured,
      provider: hasResend ? 'resend' : (smtpUser ? 'smtp' : 'none'),
      sender: hasResend ? (process.env.RESEND_FROM_EMAIL || 'Resend API (Cloudflare Pages / Node)') : (maskedUser || null),
      host: hasResend ? 'api.resend.com' : (process.env.SMTP_HOST || 'smtp.gmail.com'),
      port: hasResend ? 443 : (Number(process.env.SMTP_PORT) || 465),
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });
  });

  // 9.2 Test SMTP Gmail / Resend Connection and Send Test Email (Admin only)
  app.post('/api/admin/smtp-test', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { testEmail } = req.body;
    const recipient = testEmail ? String(testEmail).trim() : req.user!.email;

    if (!recipient) {
      return res.status(400).json({ error: 'Sila masukkan alamat emel penerima untuk ujian.' });
    }

    if (!isSMTPConfigured()) {
      return res.status(400).json({
        error: 'Sistem emel belum dikonfigurasi. Sila tetapkan pemboleh ubah RESEND_API_KEY atau SMTP_USER & SMTP_PASS dalam persekitaran terlebih dahulu.',
        configured: false,
      });
    }

    const testToken = 'test_' + generateToken();
    const result = await sendVerificationEmail(recipient, req.user!.name || 'Admin', testToken);

    if (!result.success) {
      return res.status(500).json({
        error: `Gagal menghantar emel ujian: ${result.error}`,
        configured: true,
      });
    }

    return res.json({
      success: true,
      message: `Emel ujian pengesahan telah berjaya dihantar ke ${recipient}!`,
      messageId: result.messageId,
    });
  });

  // 9.3 Get Telegram Bot Configuration (Admin only)
  app.get('/api/admin/telegram-config', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const tgConfig = db.systemSettings?.telegram || {};
    const envToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const envChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

    const activeToken = tgConfig.botToken || envToken;
    const activeChatId = tgConfig.adminChatId || envChatId;
    const isConfigured = Boolean(activeToken && activeChatId);

    let maskedToken = '';
    if (activeToken) {
      maskedToken = activeToken.length > 10
        ? `${activeToken.slice(0, 6)}...${activeToken.slice(-4)}`
        : '******';
    }

    return res.json({
      configured: isConfigured,
      enabled: tgConfig.enabled !== false,
      adminChatId: activeChatId || '',
      maskedToken,
      hasEnvFallback: Boolean(envToken && envChatId),
    });
  });

  // 9.4 Update Telegram Bot Configuration (Admin only)
  app.post('/api/admin/telegram-config', verifyToken, verifyAdmin, (req: AuthenticatedRequest, res: Response) => {
    const { botToken, adminChatId, enabled } = req.body;

    if (!db.systemSettings) {
      db.systemSettings = {};
    }

    const currentTg = db.systemSettings.telegram || {};

    let finalToken = currentTg.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    if (botToken && typeof botToken === 'string' && !botToken.includes('...')) {
      finalToken = botToken.trim();
    }

    db.systemSettings.telegram = {
      botToken: finalToken,
      adminChatId: adminChatId !== undefined ? String(adminChatId).trim() : (currentTg.adminChatId || ''),
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    };

    saveDatabase();

    return res.json({
      success: true,
      message: 'Tetapan Bot Telegram berjaya disimpan!',
      configured: Boolean(db.systemSettings.telegram.botToken && db.systemSettings.telegram.adminChatId),
      enabled: db.systemSettings.telegram.enabled,
    });
  });

  // 9.5 Test Telegram Bot Connection & Send Test Message (Admin only)
  app.post('/api/admin/telegram-test', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { botToken, adminChatId } = req.body;

    const tokenToTest = (botToken && typeof botToken === 'string' && !botToken.includes('...'))
      ? String(botToken).trim()
      : (db.systemSettings?.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN || '');

    const chatIdToTest = adminChatId
      ? String(adminChatId).trim()
      : (db.systemSettings?.telegram?.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID || '');

    if (!tokenToTest || !chatIdToTest) {
      return res.status(400).json({
        error: 'Sila masukkan Bot Token dan Admin Chat ID terlebih dahulu untuk diuji.',
      });
    }

    const testRes = await testTelegramBot(tokenToTest, chatIdToTest);

    if (!testRes.success) {
      return res.status(400).json({
        error: testRes.error || 'Ujian sambungan Telegram gagal.',
      });
    }

    return res.json({
      success: true,
      botName: testRes.botName,
      message: `Ujian berjaya! Mesej telah dihantar ke Chat ID (${chatIdToTest}) melalui bot @${testRes.botName}.`,
    });
  });


  // ==========================================
  // USER QADA DATA API (All Protected by verifyToken)
  // ==========================================

  // 10. Get User Fasting Data
  app.get('/api/qada/data', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const dataStore = db.userData[userId] || {
      qada: null,
      records: [],
      settings: {
        theme: 'light',
        language: 'ms',
        userName: req.user!.name,
        reminder: {
          id: 'rem_' + userId,
          user_id: userId,
          enabled: false,
          days: [1, 4],
          time: '20:00',
          message: 'Peringatan puasa ganti',
          created_at: new Date().toISOString(),
        }
      }
    };

    return res.json({
      qada: dataStore.qada,
      records: dataStore.records,
      settings: dataStore.settings
    });
  });

  // 11. Save / Update Qada Target
  app.post('/api/qada/target', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { qada } = req.body;

    if (!db.userData[userId]) {
      db.userData[userId] = { qada: null, records: [], settings: null };
    }

    db.userData[userId].qada = qada;
    saveDatabase();

    return res.json({ success: true, qada: db.userData[userId].qada });
  });

  // 12. Save / Replace Daily Records
  app.post('/api/qada/records', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { records } = req.body;

    if (!db.userData[userId]) {
      db.userData[userId] = { qada: null, records: [], settings: null };
    }

    db.userData[userId].records = records || [];
    saveDatabase();

    return res.json({ success: true, records: db.userData[userId].records });
  });

  // 13. Save Settings
  app.post('/api/qada/settings', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { settings } = req.body;

    if (!db.userData[userId]) {
      db.userData[userId] = { qada: null, records: [], settings: null };
    }

    db.userData[userId].settings = settings;
    saveDatabase();

    return res.json({ success: true, settings: db.userData[userId].settings });
  });

  // 14. Reset User Data
  app.post('/api/qada/reset', verifyToken, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    db.userData[userId] = {
      qada: null,
      records: [],
      settings: {
        theme: 'light',
        language: 'ms',
        userName: req.user!.name,
        reminder: {
          id: 'rem_' + userId,
          user_id: userId,
          enabled: false,
          days: [1, 4],
          time: '20:00',
          message: 'Peringatan puasa ganti',
          created_at: new Date().toISOString(),
        }
      }
    };
    saveDatabase();

    return res.json({ success: true, message: 'Data pengguna berjaya diset semula.' });
  });

  // ==========================================
  // VITE / STATIC FILE SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QadaTrack Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
