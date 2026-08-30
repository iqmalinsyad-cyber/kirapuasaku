import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, ShieldCheck, Clock, Search, 
  Trash2, X, RefreshCw, KeyRound,
  RotateCcw, AlertTriangle, Copy, Check, Share2,
  Mail, Send, CheckCircle2, XCircle, Info, ExternalLink
} from 'lucide-react';
import { AdminUserItem, Language } from '../types';
import { getTranslation } from '../translations';
import { adminApi } from '../utils/api';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenShareUser?: (user: AdminUserItem) => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  language,
  onShowToast,
  onOpenShareUser,
}) => {
  const t = getTranslation(language);

  const [activeMainTab, setActiveMainTab] = useState<'users' | 'smtp'>('users');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // SMTP Settings & Test State
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    host: string;
    port: number;
    sender: string | null;
    appUrl: string;
  } | null>(null);
  const [testEmailInput, setTestEmailInput] = useState<string>('');
  const [isTestingSMTP, setIsTestingSMTP] = useState<boolean>(false);
  const [testSMTPResult, setTestSMTPResult] = useState<{ success: boolean; message: string } | null>(null);

  // Confirmation & Action Modals State
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [userToReset, setUserToReset] = useState<AdminUserItem | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetResult, setResetResult] = useState<{ user: AdminUserItem; defaultPass: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers();
      if (res.data?.users) {
        setUsers(res.data.users);
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Gagal memuat senarai pengguna.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSMTPStatus = async () => {
    try {
      const res = await adminApi.getSMTPStatus();
      if (res.data) {
        setSmtpStatus(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch SMTP status', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchSMTPStatus();
      setUserToDelete(null);
      setUserToReset(null);
      setResetResult(null);
      setTestSMTPResult(null);
    }
  }, [isOpen]);

  const handleTestSMTP = async () => {
    if (!testEmailInput || !testEmailInput.includes('@')) {
      onShowToast('Sila masukkan alamat emel yang sah untuk ujian.', 'error');
      return;
    }
    setIsTestingSMTP(true);
    setTestSMTPResult(null);
    try {
      const res = await adminApi.testSMTP(testEmailInput.trim());
      if (res.data?.success) {
        setTestSMTPResult({ success: true, message: res.data.message });
        onShowToast(res.data.message, 'success');
      } else {
        const errMsg = res.error || 'Ujian SMTP gagal.';
        setTestSMTPResult({ success: false, message: errMsg });
        onShowToast(errMsg, 'error');
      }
    } catch (e: any) {
      const errMsg = e.message || 'Ralat semasa menjalankan ujian SMTP.';
      setTestSMTPResult({ success: false, message: errMsg });
      onShowToast(errMsg, 'error');
    } finally {
      setIsTestingSMTP(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await adminApi.updateUserStatus(userId, status);
      if (res.data) {
        onShowToast(res.data.message || t.statusUpdatedToast, 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status } : u))
        );
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat mengemaskini status pengguna.', 'error');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await adminApi.deleteUser(userToDelete.id);
      if (res.data?.message || res.data?.success || !res.error) {
        onShowToast(res.data?.message || t.userDeletedSuccess, 'success');
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat memadam pengguna.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!userToReset) return;
    setIsResetting(true);
    try {
      const res = await adminApi.resetUserPassword(userToReset.id);
      if (res.data?.success) {
        const defaultPass = res.data.defaultPassword || 'track12345';
        onShowToast(res.data.message || t.resetPasswordSuccessToast, 'success');
        setResetResult({ user: userToReset, defaultPass });
        setUsers((prev) =>
          prev.map((u) => (u.id === userToReset.id ? { ...u, email_verified: true, status: 'approved' } : u))
        );
        setUserToReset(null);
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat menetapkan semula kata laluan.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPassword(true);
    onShowToast(language === 'ms' ? 'Kata laluan disalin!' : 'Password copied!', 'success');
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleVerifyEmailManually = async (userId: string) => {
    try {
      const res = await adminApi.verifyUserEmail(userId);
      if (res.data) {
        onShowToast(res.data.message || 'Emel berjaya disahkan oleh Admin.', 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, email_verified: true, status: 'approved' } : u))
        );
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat mengesahkan emel pengguna.', 'error');
    }
  };

  if (!isOpen) return null;

  const unverifiedEmailCount = users.filter((u) => !u.email_verified).length;
  const approvedCount = users.filter((u) => u.status === 'approved' && u.email_verified).length;

  const filteredUsers = users.filter((u) => {
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && !u.email_verified) ||
      (filterStatus === 'approved' && u.status === 'approved' && u.email_verified) ||
      (filterStatus === 'rejected' && u.status === 'rejected');
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-amber-400 dark:bg-stone-800 border border-stone-700">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>{t.adminPanelTitle}</span>
                <span className="rounded-md bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {users.length} {t.allUsersCount}
                </span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {t.adminPanelSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Navigation between Users & SMTP */}
            <div className="flex rounded-xl bg-stone-200/80 p-0.5 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setActiveMainTab('users')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  activeMainTab === 'users'
                    ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-700 dark:text-white'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pengguna</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab('smtp');
                  fetchSMTPStatus();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  activeMainTab === 'smtp'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>SMTP Gmail</span>
                {smtpStatus?.configured && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-white transition cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeMainTab === 'smtp' ? (
          /* SMTP GMAIL / NODEMAILER VIEW */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* Status Card */}
            <div className={`rounded-2xl border p-4 sm:p-5 ${
              smtpStatus?.configured 
                ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30' 
                : 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    smtpStatus?.configured 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                      : 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        Status Nodemailer (SMTP Gmail)
                      </h3>
                      {smtpStatus?.configured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif & Disambung
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          <Clock className="h-3 w-3" />
                          Mod Auto-Aktif (Sedia Dikonfigurasi)
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {smtpStatus?.configured
                        ? `Pelayan SMTP Gmail aktif melalui pengirim: ${smtpStatus.sender || 'SMTP_USER'}. Setiap pendaftaran akaun baharu akan dihantar emel pengesahan secara automatik.`
                        : 'Pemboleh ubah SMTP_USER dan SMTP_PASS belum dikesan dalam persekitaran pelayan. Sistem kini berjalan dalam mod pendaftaran pantas di mana pengguna boleh terus log masuk dengan selamat.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchSMTPStatus}
                  title="Semak Semula Status SMTP"
                  className="rounded-xl border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Test Email Section */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900/80 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-2 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-emerald-600" />
                <span>Ujian Penghantaran Emel Nodemailer</span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                Masukkan alamat emel anda di bawah untuk menguji penghantaran template emel pengesahan pendaftaran akaun:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder="contoh: emelanda@gmail.com"
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-medium text-stone-900 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                />
                <button
                  type="button"
                  disabled={isTestingSMTP}
                  onClick={handleTestSMTP}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {isTestingSMTP ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sedang Menghantar...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Hantar Emel Ujian</span>
                    </>
                  )}
                </button>
              </div>

              {testSMTPResult && (
                <div className={`mt-3 rounded-xl border p-3 text-xs ${
                  testSMTPResult.success
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                    : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {testSMTPResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testSMTPResult.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick 3-Step Setup Guide & Cloudflare Notice */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900/50 space-y-4">
              
              {/* Cloudflare Pages vs Node.js Notice */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-3.5 text-xs text-blue-950 dark:text-blue-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-100">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Nota Penting Mengenai Cloudflare Pages vs Pelayan Node.js</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                  <strong>Cloudflare Pages</strong> adalah platform pengehosan <em>Frontend Statik</em>. Fail <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 rounded">server.ts</code> (Express + Nodemailer) memerlukan persekitaran <strong>Node.js</strong> (seperti Google Cloud Run, Render, Railway, atau VPS) untuk menghantar emel keluar secara langsung.
                </p>
                <div className="pt-1 border-t border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400">
                    💡 <strong>Tip Pentadbir:</strong> Jika anda mengehos di Cloudflare Pages, anda boleh mengesahkan emel pengguna baru dengan 1-klik di tab <strong>"Senarai Pengguna"</strong> (tekan butang hijau <strong>"Sahkan Emel"</strong>).
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-stone-500" />
                <span>Panduan 3 Langkah Mengaktifkan SMTP Gmail (Node.js / Cloud Run)</span>
              </h4>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl bg-white dark:bg-stone-800/80 p-3 border border-stone-200 dark:border-stone-700/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">1</span>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-white">Aktifkan 2-Step Verification di Google</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Buka akaun Google anda dan pastikan Pengesahan 2 Langkah (2FA) dihidupkan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white dark:bg-stone-800/80 p-3 border border-stone-200 dark:border-stone-700/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">2</span>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-white">Jana Google App Password (16-Digit)</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Layari <strong className="font-mono text-emerald-700 dark:text-emerald-400">myaccount.google.com/apppasswords</strong>, cipta nama aplikasi (cth: "KiraPuasaKu") dan salin 16 aksara kata laluan yang dijana.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white dark:bg-stone-800/80 p-3 border border-stone-200 dark:border-stone-700/60">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">3</span>
                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-white">Masukkan Nilai dalam Pelayan Node.js / .env</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      Tetapkan <code className="font-mono text-xs font-bold bg-stone-100 dark:bg-stone-900 px-1 rounded">SMTP_USER=emelanda@gmail.com</code> dan <code className="font-mono text-xs font-bold bg-stone-100 dark:bg-stone-900 px-1 rounded">SMTP_PASS=abcdefghijklmnop</code> di dalam tetapan pelayan Node.js anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* USERS LIST VIEW */
          <>
            {/* Filter Bar & Search */}
            <div className="border-b border-stone-200 p-3.5 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              
              {/* Status Tabs */}
              <div className="flex rounded-xl bg-stone-100 p-1 dark:bg-stone-800 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 sm:flex-initial rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 ${
                    filterStatus === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs dark:bg-stone-700 dark:text-white'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  {t.tabAllUsers} ({users.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`flex-1 sm:flex-initial rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 ${
                    filterStatus === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  {t.tabPendingUsers} ({unverifiedEmailCount})
                </button>
                <button
                  onClick={() => setFilterStatus('approved')}
                  className={`flex-1 sm:flex-initial rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 ${
                    filterStatus === 'approved'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                  }`}
                >
                  {t.tabApprovedUsers} ({approvedCount})
                </button>
              </div>

              {/* Search input & Refresh */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ms' ? 'Cari pengguna...' : 'Search users...'}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-8 pr-3 py-1 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </div>

                <button
                  onClick={fetchUsers}
                  disabled={isLoading}
                  title="Muat Semula"
                  className="rounded-xl border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

            </div>

            {/* User List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">

          
          {/* Reset Result Notification Card */}
          {resetResult && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3.5 animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shrink-0 mt-0.5">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                      {language === 'ms' ? 'Kata Laluan Berjaya Ditetapkan Semula' : 'Password Successfully Reset'}
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-200 mt-0.5">
                      {language === 'ms'
                        ? `Akaun "${resetResult.user.name}" (@${resetResult.user.username}) kini boleh log masuk menggunakan kata laluan di bawah:`
                        : `Account "${resetResult.user.name}" (@${resetResult.user.username}) can now sign in using the password below:`}
                    </p>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 shadow-2xs">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
                          {resetResult.defaultPass}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(resetResult.defaultPass)}
                          className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-300 cursor-pointer"
                        >
                          {copiedPassword ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setResetResult(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
              <Users className="mx-auto h-10 w-10 stroke-[1.5] mb-2 opacity-50" />
              <p className="text-xs font-medium">
                {filterStatus === 'pending' ? t.emptyPendingUsers : 'Tiada rekod pengguna dijumpai.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`rounded-xl border p-3 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  !u.email_verified
                    ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                    : u.status === 'rejected'
                    ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/10 opacity-70'
                    : 'border-stone-200/80 bg-white dark:border-stone-800 dark:bg-stone-900'
                }`}
              >
                {/* User Avatar & Info */}
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`}
                      alt={u.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                        {u.name}
                      </h3>
                      <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
                        @{u.username}
                      </span>
                      {u.role === 'admin' && (
                        <span className="rounded bg-stone-900 text-amber-400 dark:bg-stone-800 px-1.5 py-0.2 text-[9px] font-bold border border-stone-700">
                          Admin
                        </span>
                      )}
                    </div>

                    {/* Email address */}
                    {u.email && (
                      <p className="text-[11px] font-medium text-stone-600 dark:text-stone-300 mt-0.5">
                        ✉️ {u.email}
                      </p>
                    )}

                    {/* Status badge & Meta */}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.2 text-[9px] font-bold ${
                          u.email_verified
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {u.email_verified ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                        <span>
                          {u.email_verified ? t.emailVerifiedLabel : t.emailUnverifiedLabel}
                        </span>
                      </span>

                      <span>•</span>
                      <span>Daftar: {new Date(u.created_at).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US')}</span>
                      {u.qadaRequired ? (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                            Qada: {u.qadaCompleted || 0} / {u.qadaRequired} {t.daysUnit}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                  
                  {/* Manual verify email if pending */}
                  {!u.email_verified && (
                    <button
                      onClick={() => handleVerifyEmailManually(u.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs transition cursor-pointer"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>{t.btnVerifyEmailAdmin}</span>
                    </button>
                  )}

                  {/* Reset Password Action Button */}
                  <button
                    onClick={() => setUserToReset(u)}
                    title={t.btnResetPasswordAdmin}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 transition cursor-pointer shadow-2xs"
                  >
                    <KeyRound className="h-3 w-3 text-stone-500 dark:text-stone-400" />
                    <span>{t.btnResetPasswordAdmin}</span>
                  </button>

                  {/* Disable / Enable User */}
                  {u.status === 'approved' && u.role !== 'admin' && (
                    <button
                      onClick={() => handleUpdateStatus(u.id, 'rejected')}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 transition cursor-pointer"
                    >
                      {t.btnReject}
                    </button>
                  )}

                  {u.status === 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(u.id, 'approved')}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white transition cursor-pointer"
                    >
                      {t.btnApprove}
                    </button>
                  )}

                  {/* Share Report for User (Admin) */}
                  {onOpenShareUser && (
                    <button
                      onClick={() => onOpenShareUser(u)}
                      title="Kongsi Kad Laporan Pengguna"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200 transition cursor-pointer shadow-2xs"
                    >
                      <Share2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.btnShare}</span>
                    </button>
                  )}

                  {/* Delete User Button */}
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      title="Padam Pengguna"
                      className="rounded-lg border border-rose-200 bg-rose-50/70 p-1 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )}

    {/* Footer */}

        <div className="border-t border-stone-200 p-3.5 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 transition cursor-pointer"
          >
            {t.btnCancel}
          </button>
        </div>

      </div>

      {/* MODAL 1: RESET PASSWORD CONFIRMATION */}
      {userToReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 animate-in zoom-in-95">
            
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  {t.confirmResetPasswordTitle}
                </h3>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  Pengguna: <strong className="text-stone-900 dark:text-white">{userToReset.name}</strong> (@{userToReset.username})
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-3.5 border border-stone-200 dark:border-stone-700/60 mb-4">
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {t.confirmResetPasswordDesc}
              </p>
              
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 p-2 shadow-2xs">
                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                  Password Default:
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60">
                  {t.defaultPasswordBadge}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setUserToReset(null)}
                className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancelAction}
              </button>
              
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmResetPassword}
                className="flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Sedang Reset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3" />
                    <span>{t.btnConfirmResetPass}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: DELETE USER CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 animate-in zoom-in-95">
            
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  {t.confirmDeleteUserTitle}
                </h3>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  Pengguna: <strong className="text-stone-900 dark:text-white">{userToDelete.name}</strong> (@{userToDelete.username})
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900/50 mb-4">
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                {t.confirmDeleteUserDesc}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancelAction}
              </button>
              
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Memadam...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    <span>{t.btnConfirmDelete}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
