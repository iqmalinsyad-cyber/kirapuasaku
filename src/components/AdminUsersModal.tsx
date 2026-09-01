import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, ShieldCheck, Clock, Search, 
  Trash2, X, RefreshCw, KeyRound,
  RotateCcw, AlertTriangle, Copy, Check, Share2,
  Mail, Send, CheckCircle2, XCircle, Info, ExternalLink, Sparkles,
  Edit3, Key, Shield, Hash
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

  const [activeMainTab, setActiveMainTab] = useState<'users' | 'accessCodes' | 'smtp'>('users');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Access Codes Management State (Akses dengan Kod)
  const [accessCodes, setAccessCodes] = useState<Array<{
    id: string;
    code: string;
    is_used: boolean;
    used_by_user_id?: string;
    used_by_username?: string;
    used_at?: string;
    notes?: string;
    created_at: string;
  }>>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState<boolean>(false);
  const [newAccessCodeInput, setNewAccessCodeInput] = useState<string>('');
  const [newAccessCodeNotes, setNewAccessCodeNotes] = useState<string>('');
  const [isCreatingAccessCode, setIsCreatingAccessCode] = useState<boolean>(false);
  const [copiedAccessCodeId, setCopiedAccessCodeId] = useState<string | null>(null);

  // Fasting Target Edit State
  const [userToEditTarget, setUserToEditTarget] = useState<AdminUserItem | null>(null);
  const [targetRequiredInput, setTargetRequiredInput] = useState<number>(0);
  const [targetCompletedInput, setTargetCompletedInput] = useState<number>(0);
  const [isUpdatingTarget, setIsUpdatingTarget] = useState<boolean>(false);

  // Registration Code Management State (REG codes)
  const [userToEditCode, setUserToEditCode] = useState<AdminUserItem | null>(null);
  const [customCodeInput, setCustomCodeInput] = useState<string>('');
  const [isUpdatingCode, setIsUpdatingCode] = useState<boolean>(false);
  const [copiedCodeUserId, setCopiedCodeUserId] = useState<string | null>(null);

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

  const fetchAccessCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const res = await adminApi.getAccessCodes();
      if (res.data?.accessCodes) {
        setAccessCodes(res.data.accessCodes);
      }
    } catch (e) {
      console.warn('Could not fetch access codes', e);
    } finally {
      setIsLoadingCodes(false);
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
      fetchAccessCodes();
      fetchSMTPStatus();
      setUserToDelete(null);
      setUserToReset(null);
      setUserToEditCode(null);
      setUserToEditTarget(null);
      setResetResult(null);
      setTestSMTPResult(null);
    }
  }, [isOpen]);

  const handleGenerateRandomAccessCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAccessCodeInput('ACC-' + rand);
  };

  const handleCreateAccessCode = async () => {
    let code = newAccessCodeInput.trim().toUpperCase();
    if (!code) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = 'ACC-' + rand;
    }

    setIsCreatingAccessCode(true);
    try {
      const res = await adminApi.createAccessCode(code, newAccessCodeNotes.trim());
      if (res.data?.accessCode) {
        onShowToast(`Kod Akses ${code} berjaya dijana!`, 'success');
        setAccessCodes((prev) => [res.data.accessCode, ...prev]);
        setNewAccessCodeInput('');
        setNewAccessCodeNotes('');
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e: any) {
      onShowToast('Ralat menjana kod akses.', 'error');
    } finally {
      setIsCreatingAccessCode(false);
    }
  };

  const handleDeleteAccessCode = async (codeId: string) => {
    try {
      const res = await adminApi.deleteAccessCode(codeId);
      if (res.data?.success || !res.error) {
        onShowToast('Kod akses berjaya dipadam.', 'success');
        setAccessCodes((prev) => prev.filter((c) => c.id !== codeId));
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat memadam kod akses.', 'error');
    }
  };

  const handleCopyAccessCode = (codeStr: string, codeId: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedAccessCodeId(codeId);
    onShowToast(`Kod akses ${codeStr} disalin!`, 'success');
    setTimeout(() => setCopiedAccessCodeId(null), 2500);
  };

  const handleOpenEditTarget = (user: AdminUserItem) => {
    setUserToEditTarget(user);
    setTargetRequiredInput(user.qadaRequired || 0);
    setTargetCompletedInput(user.qadaCompleted || 0);
  };

  const handleSaveTarget = async () => {
    if (!userToEditTarget) return;
    setIsUpdatingTarget(true);
    try {
      const res = await adminApi.updateUserTarget(
        userToEditTarget.id,
        Number(targetRequiredInput),
        Number(targetCompletedInput)
      );
      if (res.data?.success || !res.error) {
        onShowToast('Sasaran puasa pengguna berjaya dikemaskini!', 'success');
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userToEditTarget.id
              ? {
                  ...u,
                  qadaRequired: Number(targetRequiredInput),
                  qadaCompleted: Number(targetCompletedInput),
                }
              : u
          )
        );
        setUserToEditTarget(null);
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat mengemaskini sasaran puasa pengguna.', 'error');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleCopyCode = (user: AdminUserItem) => {
    const code = user.registration_code || 'KP-' + Math.floor(100000 + Math.random() * 900000);
    navigator.clipboard.writeText(code);
    setCopiedCodeUserId(user.id);
    onShowToast(t.codeCopiedToast || `Kod khas ${code} disalin!`, 'success');
    setTimeout(() => setCopiedCodeUserId(null), 2500);
  };

  const handleOpenEditCode = (user: AdminUserItem) => {
    setUserToEditCode(user);
    setCustomCodeInput(user.registration_code || ('KP-' + Math.floor(100000 + Math.random() * 900000)));
  };

  const handleAutoGenerateNewCode = (type: 'registration' | 'access' = 'registration') => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = type === 'registration' ? 'REG-' : 'ACC-';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomCodeInput(prefix + rand);
  };

  const handleSaveCustomCode = async () => {
    if (!userToEditCode || !customCodeInput.trim()) return;
    setIsUpdatingCode(true);
    const cleanCode = customCodeInput.trim().toUpperCase();
    try {
      const res = await adminApi.updateRegistrationCode(userToEditCode.id, cleanCode);
      if (res.data?.success || !res.error) {
        onShowToast(t.codeUpdateSuccessToast || `Kod khas berjaya ditukar kepada ${cleanCode}!`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u.id === userToEditCode.id ? { ...u, registration_code: cleanCode } : u))
        );
        setUserToEditCode(null);
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Ralat mengemaskini kod pendaftaran.', 'error');
    } finally {
      setIsUpdatingCode(false);
    }
  };

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
            {/* Top Navigation between Users, Access Codes & SMTP */}
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
                  setActiveMainTab('accessCodes');
                  fetchAccessCodes();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  activeMainTab === 'accessCodes'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{language === 'ms' ? 'Kod Akses' : 'Access Codes'}</span>
                <span className="rounded-full bg-amber-200/60 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 px-1.5 py-0.2 text-[9px] font-mono">
                  {accessCodes.length}
                </span>
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
                <span>{language === 'ms' ? 'Emel / SMTP' : 'Email / SMTP'}</span>
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

        {activeMainTab === 'accessCodes' ? (
          /* ACCESS CODES GENERATOR & MANAGEMENT VIEW */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            
            {/* Generate New Access Code Card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-900/60 dark:bg-amber-950/30 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>{language === 'ms' ? 'Jana Kod Akses Baharu' : 'Generate New Access Code'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRandomAccessCode}
                  className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-200 shadow-2xs hover:bg-amber-100/50 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{language === 'ms' ? 'Jana Kod Rawak' : 'Generate Random Code'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === 'ms' ? 'Kod Akses:' : 'Access Code:'}
                  </label>
                  <input
                    type="text"
                    value={newAccessCodeInput}
                    onChange={(e) => setNewAccessCodeInput(e.target.value.toUpperCase())}
                    placeholder={language === 'ms' ? "Contoh: ACC-9K82L1 (atau klik 'Jana Kod Rawak')" : "e.g. ACC-9K82L1 (or click 'Generate Random Code')"}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:border-amber-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === 'ms' ? 'Catatan / Nama Penerima (Pilihan):' : 'Notes / Recipient Name (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={newAccessCodeNotes}
                    onChange={(e) => setNewAccessCodeNotes(e.target.value)}
                    placeholder={language === 'ms' ? 'cth: Ustaz Azhar / Ahli Kariah 1' : 'e.g. Ustaz Azhar / Member 1'}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-amber-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isCreatingAccessCode}
                  onClick={handleCreateAccessCode}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingAccessCode ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{language === 'ms' ? 'Sedang Menjana...' : 'Generating...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{language === 'ms' ? 'Simpan & Aktifkan Kod Akses' : 'Save & Activate Access Code'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* List of Access Codes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                  {language === 'ms' ? `Senarai Kod Akses Yang Dijana (${accessCodes.length})` : `Generated Access Codes (${accessCodes.length})`}
                </h3>
                <button
                  type="button"
                  onClick={fetchAccessCodes}
                  disabled={isLoadingCodes}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingCodes ? 'animate-spin' : ''}`} />
                  <span>{language === 'ms' ? 'Muat Semula' : 'Refresh'}</span>
                </button>
              </div>

              {accessCodes.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-stone-200 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/30 text-stone-400">
                  <KeyRound className="mx-auto h-8 w-8 stroke-[1.5] mb-2 opacity-50 text-amber-500" />
                  <p className="text-xs font-medium">{language === 'ms' ? 'Belum ada kod akses yang dijana.' : 'No access codes generated yet.'}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{language === 'ms' ? 'Klik butang di atas untuk menjana kod akses baharu bagi pengguna.' : 'Click the button above to generate a new access code for users.'}</p>
                </div>
              ) : (
                accessCodes.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      c.is_used
                        ? 'border-stone-200/80 bg-stone-100/60 dark:border-stone-800 dark:bg-stone-900/40 opacity-70'
                        : 'border-amber-300/80 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                        c.is_used
                          ? 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          : 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                      }`}>
                        <KeyRound className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-extrabold text-stone-900 dark:text-white tracking-wider">
                            {c.code}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.2 text-[9px] font-bold ${
                            c.is_used
                              ? 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            {c.is_used ? (language === 'ms' ? 'Telah Digunakan' : 'Used') : (language === 'ms' ? 'Aktif / Belum Diguna' : 'Active / Unused')}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 space-x-2">
                          {c.notes && <span className="font-semibold text-stone-700 dark:text-stone-300">{language === 'ms' ? 'Catatan:' : 'Notes:'} {c.notes} •</span>}
                          {c.is_used && c.used_by_username ? (
                            <span className="text-stone-600 dark:text-stone-400">
                              {language === 'ms' ? 'Diguna oleh:' : 'Used by:'} <strong className="font-mono">@{c.used_by_username}</strong>
                            </span>
                          ) : (
                            <span>{language === 'ms' ? 'Dijana:' : 'Created:'} {new Date(c.created_at).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyAccessCode(c.code, c.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 cursor-pointer shadow-2xs"
                      >
                        {copiedAccessCodeId === c.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">{language === 'ms' ? 'Disalin' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{language === 'ms' ? 'Salin Kod' : 'Copy Code'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAccessCode(c.id)}
                        title="Padam Kod Akses"
                        className="rounded-lg border border-rose-200 bg-rose-50/70 p-1.5 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        ) : activeMainTab === 'smtp' ? (
          /* SMTP GMAIL / RESEND API / NODEMAILER VIEW */
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        Status Penghantaran Emel ({smtpStatus?.host?.includes('resend') ? 'Resend API (Cloudflare Pages)' : 'SMTP Gmail'})
                      </h3>
                      {smtpStatus?.configured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif & Bersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          <Clock className="h-3 w-3" />
                          Belum Dikonfigurasi
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {smtpStatus?.configured
                        ? `Sistem emel aktif melalui: ${smtpStatus.sender || smtpStatus.host}. Setiap pendaftaran akaun baharu akan dihantar emel pengesahan secara automatik ke peti masuk pengguna.`
                        : 'Pemboleh ubah RESEND_API_KEY (Cloudflare Pages) atau SMTP_USER/SMTP_PASS (Node.js) belum dikesan. Sila tetapkan kunci dalam persekitaran hos anda.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchSMTPStatus}
                  title="Semak Semula Status Emel"
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
                <span>Ujian Penghantaran Emel Pengesahan</span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                Masukkan alamat emel anda di bawah untuk menguji penghantaran template emel pengesahan pendaftaran akaun:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={(e) => setTestEmailInput(e.target.value)}
                  placeholder={language === 'ms' ? 'contoh: emelanda@gmail.com' : 'e.g. yourmail@gmail.com'}
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 dark:focus:text-white"
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
                      <span>{language === 'ms' ? 'Sedang Menghantar...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>{language === 'ms' ? 'Hantar Emel Ujian' : 'Send Test Email'}</span>
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

            {/* Cloudflare Pages + Resend API Setup Guide */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900/50 space-y-4">
              
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Kaedah Cloudflare Pages (Resend REST API) — Disyorkan</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Sistem kini dilengkapi modul <strong>Cloudflare Pages Functions (<code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 rounded">/functions/api</code>)</strong> yang menyokong <strong>Resend.com</strong> (3,000 emel percuma sebulan).
                </p>
                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-900/50 space-y-1.5 text-[11px]">
                  <p><strong>Langkah Konfigurasi di Cloudflare Dashboard:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-700 dark:text-stone-300">
                    <li>Daftar akaun percuma di <strong className="text-emerald-700 dark:text-emerald-400">resend.com</strong> & jana API Key (bermula <code className="font-mono">re_...</code>).</li>
                    <li>Di Cloudflare Pages, buka <strong>Settings &gt; Variables and secrets</strong>.</li>
                    <li>Tambah pembolehubah: <code className="font-mono font-bold bg-white dark:bg-stone-800 px-1 rounded">RESEND_API_KEY</code> (Pilih jenis <strong>Secret</strong>).</li>
                    <li>(Pilihan) Tambah <code className="font-mono font-bold bg-white dark:bg-stone-800 px-1 rounded">RESEND_FROM_EMAIL</code> (cth: <code className="font-mono">onboarding@resend.dev</code> atau domain anda).</li>
                    <li>Lakukan <strong>Deploy Semula (Redeploy)</strong> di Cloudflare Pages selepas menyimpan variable tersebut.</li>
                  </ol>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-stone-500" />
                <span>Alternatif: Panduan SMTP Gmail (Untuk Pelayan Node.js / Cloud Run)</span>
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
                    <p className="text-xs font-bold text-stone-900 dark:text-white">Tetapkan SMTP_USER & SMTP_PASS dalam .env</p>
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
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/80 pl-8 pr-3 py-1 text-xs font-semibold text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:placeholder:text-stone-500 dark:focus:bg-stone-800 dark:focus:text-white"
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

                    {/* Email address & Registration Code */}
                    <div className="mt-0.5 space-y-1">
                      {u.email && (
                        <p className="text-[11px] font-medium text-stone-600 dark:text-stone-300">
                          ✉️ {u.email}
                        </p>
                      )}

                      {/* Special Registration Code Display for Admin */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                          {t.adminCodeBadge || 'Kod Khas:'}
                        </span>
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/90 px-2 py-0.5 dark:border-amber-700/80 dark:bg-amber-950/60 shadow-2xs">
                          <KeyRound className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200 tracking-wider">
                            {u.registration_code || 'KP-100000'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(u)}
                            title={t.btnCopyCode || 'Salin Kod Khas'}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-200/70 dark:text-amber-300 dark:hover:bg-amber-900 transition cursor-pointer"
                          >
                            {copiedCodeUserId === u.id ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                                <span className="text-emerald-700 dark:text-emerald-400">Disalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCode(u)}
                            title={t.btnEditCode || 'Tukar Kod Khas'}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-stone-700 hover:bg-amber-200/70 dark:text-stone-300 dark:hover:bg-amber-900 transition cursor-pointer"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            <span>Tukar</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status badge & Meta */}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 flex-wrap">
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
                      {u.qadaRequired !== undefined ? (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                            Qada: {u.qadaCompleted || 0} / {u.qadaRequired} {t.daysUnit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTarget(u)}
                            title="Kemaskini Sasaran Puasa Pengguna"
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-800 transition cursor-pointer"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            <span>Edit Target</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditTarget(u)}
                          title="Tetapkan Sasaran Puasa Pengguna"
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition cursor-pointer"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>+ Set Target</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                  
                  {/* Manual verify user/code if pending */}
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

      {/* MODAL 0: EDIT / SET REGISTRATION CODE */}
      {userToEditCode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 animate-in zoom-in-95">
            
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  Tetapkan Kod Khas Pendaftaran
                </h3>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  Pengguna: <strong className="text-stone-900 dark:text-white">{userToEditCode.name}</strong> (@{userToEditCode.username})
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-3.5 border border-stone-200 dark:border-stone-700/60 mb-4 space-y-3">
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Anda boleh menetapkan sebarang kod manual mengikut kehendak anda atau klik butang jana automatik di bawah:
              </p>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300">
                  Kod Khas Pengesahan:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan Kod Khas"
                    className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:border-amber-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateNewCode('registration')}
                    title="Jana Kod Pendaftaran Baharu (REG-)"
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 transition cursor-pointer shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>REG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateNewCode('access')}
                    title="Jana Kod Akses Baharu (ACC-)"
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 transition cursor-pointer shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>ACC</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isUpdatingCode}
                onClick={() => setUserToEditCode(null)}
                className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancelAction}
              </button>
              
              <button
                type="button"
                disabled={isUpdatingCode || !customCodeInput.trim()}
                onClick={handleSaveCustomCode}
                className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingCode ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Simpan Kod</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* MODAL 3: EDIT USER TARGET (Sasaran Puasa) */}
      {userToEditTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 animate-in zoom-in-95">
            
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                <Edit3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  Kemaskini Sasaran Puasa
                </h3>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                  Pengguna: <strong className="text-stone-900 dark:text-white">{userToEditTarget.name}</strong> (@{userToEditTarget.username})
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 dark:bg-stone-800/60 p-3.5 border border-stone-200 dark:border-stone-700/60 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Jumlah Hari Qada Perlu Diganti (Sasaran):
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetRequiredInput}
                  onChange={(e) => setTargetRequiredInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold font-mono text-stone-900 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Jumlah Hari Qada Telah Selesai:
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetCompletedInput}
                  onChange={(e) => setTargetCompletedInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold font-mono text-emerald-700 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isUpdatingTarget}
                onClick={() => setUserToEditTarget(null)}
                className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancelAction}
              </button>
              
              <button
                type="button"
                disabled={isUpdatingTarget}
                onClick={handleSaveTarget}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingTarget ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Simpan Sasaran</span>
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
