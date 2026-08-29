import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Bell, Moon, Sun, Globe, Download, 
  Upload, Trash2, Shield, User as UserIcon, Check, AlertTriangle, 
  Target, RefreshCw, KeyRound, LogOut, Camera, ShieldCheck, CheckCircle2, Lock, Eye, EyeOff,
  Table, Copy, ExternalLink, Send, ArrowRight, Smartphone, Sparkles, PlusCircle
} from 'lucide-react';
import { UserSettings, Language, ThemeMode, QadaRecord, ReminderConfig, User, DailyRecord } from '../types';
import { getTranslation } from '../translations';
import { exportAllDataAsJSON, importAllDataFromJSON } from '../utils/storage';
import { authApi } from '../utils/api';
import { MUSLIM_AVATARS, MuslimAvatar } from '../utils/avatars';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, syncToGoogleSheetWebhook } from '../utils/googleSheets';
import { InstallAppModal } from './InstallAppModal';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  qada: QadaRecord | null;
  records?: DailyRecord[];
  onUpdateTarget: (newTotal: number) => void;
  onResetAllData: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onTriggerTestReminder: (message: string) => void;
  currentUser?: User | null;
  onUserUpdated?: (user: User) => void;
  onLogout?: () => void;
  onOpenAdminUsers?: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  qada,
  records = [],
  onUpdateTarget,
  onResetAllData,
  language,
  setLanguage,
  theme,
  setTheme,
  onTriggerTestReminder,
  currentUser,
  onUserUpdated,
  onLogout,
  onOpenAdminUsers,
  onShowToast,
}) => {
  const t = getTranslation(language);

  // User profile state
  const [profileName, setProfileName] = useState<string>(currentUser?.name || settings.userName || '');
  const [profileUsername, setProfileUsername] = useState<string>(currentUser?.username || '');
  const [profileAvatar, setProfileAvatar] = useState<string>(
    currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'user')}`
  );
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Target edit state
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [targetInput, setTargetInput] = useState<number>(qada ? qada.total_required : 15);

  // Reminder local state
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(settings.reminder);

  // Google Sheets state
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState<string>(settings.googleSheetWebhookUrl || '');
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Reset confirmation state
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string>('');

  // PWA / Add to Home State
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          onShowToast(language === 'ms' ? 'Aplikasi sedang dipasang!' : 'App installation started!', 'success');
          setDeferredPrompt(null);
        }
      } catch (e) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileUsername.trim()) {
      onShowToast(language === 'ms' ? 'Sila lengkapkan nama dan username.' : 'Please enter name and username.', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await authApi.updateProfile(profileName.trim(), profileUsername.trim(), profileAvatar);
      if (res.data?.user) {
        if (onUserUpdated) onUserUpdated(res.data.user);
        onUpdateSettings({
          ...settings,
          userName: res.data.user.name,
        });
        onShowToast(res.data.message || t.profileUpdatedSuccess, 'success');
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Gagal mengemaskini profil.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onShowToast(language === 'ms' ? 'Sila isi kedua-dua kata laluan.' : 'Please fill in both passwords.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      onShowToast(language === 'ms' ? 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.' : 'New password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast(language === 'ms' ? 'Pengesahan kata laluan baharu tidak sepadan.' : 'New passwords do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      if (res.data?.message) {
        onShowToast(res.data.message || t.passwordChangedSuccess, 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (res.error) {
        onShowToast(res.error, 'error');
      }
    } catch (e) {
      onShowToast('Gagal menukar kata laluan.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Upload Custom Avatar image
  const handleUploadCustomAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast(language === 'ms' ? 'Saiz fail mestilah di bawah 2MB.' : 'File size must be under 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setProfileAvatar(result);
        onShowToast(language === 'ms' ? 'Gambar profil dipilih. Sila klik Simpan Profil.' : 'Avatar selected. Click Save Profile.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Target Modal
  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetInput > 0) {
      onUpdateTarget(targetInput);
      setShowTargetModal(false);
      onShowToast(t.recordUpdatedToast, 'success');
    }
  };

  // Reminder toggle
  const handleToggleReminder = () => {
    const nextState = !reminderConfig.enabled;
    const updated = { ...reminderConfig, enabled: nextState };
    setReminderConfig(updated);
    onUpdateSettings({ ...settings, reminder: updated });
    onShowToast(nextState ? 'Peringatan diaktifkan' : 'Peringatan dimatikan', 'success');
  };

  const handleReminderDaysChange = (days: number[]) => {
    const updated = { ...reminderConfig, days };
    setReminderConfig(updated);
    onUpdateSettings({ ...settings, reminder: updated });
    onShowToast('Hari peringatan dikemaskini', 'success');
  };

  const handleReminderTimeChange = (time: string) => {
    const updated = { ...reminderConfig, time };
    setReminderConfig(updated);
    onUpdateSettings({ ...settings, reminder: updated });
  };

  // Save Google Sheets Webhook URL
  const handleSaveGoogleSheetUrl = () => {
    const cleaned = sheetWebhookUrl.trim();
    onUpdateSettings({
      ...settings,
      googleSheetWebhookUrl: cleaned,
    });
    onShowToast(language === 'ms' ? 'URL Webhook Google Sheets disimpan!' : 'Google Sheets Webhook URL saved!', 'success');
  };

  // Sync Data directly to Google Sheet
  const handleSyncToGoogleSheet = async () => {
    const url = sheetWebhookUrl.trim() || settings.googleSheetWebhookUrl;
    if (!url) {
      onShowToast(language === 'ms' ? 'Sila masukkan URL Google Apps Script Web App terlebih dahulu.' : 'Please enter your Google Apps Script Web App URL first.', 'error');
      return;
    }

    setIsSyncingSheet(true);
    try {
      const res = await syncToGoogleSheetWebhook(url, currentUser || null, qada, records);
      const nowStr = new Date().toLocaleString(language === 'ms' ? 'ms-MY' : 'en-US');
      onUpdateSettings({
        ...settings,
        googleSheetWebhookUrl: url,
        lastGoogleSheetSync: nowStr,
      });
      onShowToast(res.message || t.googleSheetSyncSuccessToast, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Ralat semasa menghantar ke Google Sheet.', 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    onShowToast(t.scriptCopiedSuccess, 'success');
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // JSON Export / Import
  const handleExport = () => {
    const json = exportAllDataAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qadatrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Data berjaya dieksport.', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllDataFromJSON(content);
        if (success) {
          setImportStatus('Data berjaya diimport! Memuat semula...');
          onShowToast('Data berjaya diimport.', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } else {
          setImportStatus('Format fail tidak sah.');
          onShowToast('Format fail sandaran tidak sah.', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="border-b border-stone-200/80 pb-4 dark:border-stone-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2.5">
          <SettingsIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>{t.settingsTitle}</span>
        </h1>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
          {t.settingsSubtitle}
        </p>
      </div>

      {/* PWA & Install App Mobile Banner - Visible for both Admin & User */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6 shadow-sm dark:border-emerald-800/60 dark:from-emerald-950/40 dark:via-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative h-13 w-13 rounded-2xl overflow-hidden bg-white dark:bg-stone-800 border border-emerald-200 dark:border-emerald-800 p-1 shadow-md shadow-emerald-500/10 shrink-0">
              <img
                src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
                alt="KiraPuasaKu App Icon"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                  {t.sectionPwa}
                </h2>
                {isStandalone ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <Check className="h-3 w-3" />
                    <span>{t.pwaInstalledBadge}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span>Add to Home</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-300 max-w-xl leading-relaxed">
                {t.pwaDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              id="btn-install-app"
              onClick={handleInstallClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{t.btnInstallApp}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition cursor-pointer shrink-0"
              title="Panduan Pemasangan"
              aria-label="Panduan Pemasangan"
            >
              <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Profil & Akaun Pengguna */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.sectionUserAccount}</span>
            </h2>
            {currentUser?.role === 'admin' && (
              <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-amber-300 dark:bg-stone-800 border border-stone-700">
                Admin
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                {t.labelProfilePicture}
              </label>
              
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-emerald-600/60 bg-stone-100 dark:bg-stone-800 shrink-0 shadow-2xs">
                  <img
                    src={profileAvatar}
                    alt="Current Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {t.avatarHelpText || 'Pilih avatar atau muat naik foto:'}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 cursor-pointer">
                      <Camera className="h-3 w-3" />
                      <span>{t.btnUploadPhoto}</span>
                      <input type="file" accept="image/*" onChange={handleUploadCustomAvatar} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Avatar Preset Grid */}
              <div className="mt-3 grid grid-cols-6 gap-1.5">
                {MUSLIM_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setProfileAvatar(av.dataUrl)}
                    title={av.name}
                    className={`h-9 w-9 rounded-lg overflow-hidden border transition cursor-pointer ${
                      profileAvatar === av.dataUrl
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                        : 'border-stone-200 dark:border-stone-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av.dataUrl} alt={av.name} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Name input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelFullName}
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            {/* Username input */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelUsername}
              </label>
              <input
                type="text"
                required
                value={profileUsername}
                onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-mono text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="flex-1 rounded-xl bg-stone-900 text-white py-2.5 text-xs font-bold shadow-2xs hover:bg-stone-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition cursor-pointer"
              >
                {isUpdatingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </button>

              {onLogout && (
                <button
                  type="button"
                  id="settings-profile-logout-btn"
                  onClick={onLogout}
                  title={t.btnLogout}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 transition cursor-pointer shrink-0 shadow-2xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.btnLogout}</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 2. Keselamatan & Tukar Kata Laluan */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Keselamatan & Kata Laluan</span>
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelCurrentPassword}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t.placeholderCurrentPassword}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelNewPassword}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.placeholderNewPassword}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelConfirmPassword}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.placeholderConfirmPassword}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPassword ? 'Sembunyi' : 'Papar Kata Laluan'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 transition cursor-pointer"
            >
              {isChangingPassword ? 'Mengemaskini...' : t.btnChangePassword}
            </button>
          </form>
        </div>

        {/* 3. INTEGRASI DATABASE UTAMA GOOGLE SHEETS (KHUSUS ADMIN SAHAJA UNTUK PRIVASI) */}
        {currentUser?.role === 'admin' && (
          <div className="md:col-span-2 rounded-2xl border-2 border-emerald-700/40 bg-emerald-950/10 p-5 shadow-2xs dark:border-emerald-600/40 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/20 pb-3.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <Table className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Google Sheets Sebagai Database Utama</span>
                  </h2>
                  <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-amber-300 dark:bg-stone-800 border border-stone-700">
                    Khusus Pentadbir (Admin)
                  </span>
                  <span className="rounded-md bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold">
                    🟢 Auto-Sync Aktif
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  Segala data sasaran qada, rekod puasa harian, dan profil pengguna akan disimpan dan diselaraskan secara langsung ke Google Sheet anda sebagai pengkalan data utama.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAppsScriptModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 transition cursor-pointer shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{t.btnViewAppsScriptCode}</span>
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1">
                  {t.labelGoogleSheetsUrl}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={sheetWebhookUrl}
                    onChange={(e) => setSheetWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-mono text-stone-900 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGoogleSheetUrl}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 transition cursor-pointer shrink-0"
                  >
                    {t.btnSaveSheetUrl}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  <span>{t.lastSyncedLabel}: </span>
                  <strong className="text-stone-700 dark:text-stone-300 font-mono">
                    {settings.lastGoogleSheetSync || 'Auto-sync bersedia (Setiap tindakan direkodkan)'}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncToGoogleSheet}
                    disabled={isSyncingSheet}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSyncingSheet ? 'Menyelaraskan ke Google Sheet...' : 'Kemaskini Google Sheet Sekarang'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Sasaran Puasa Ganti */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.sectionProfile}</span>
            </h2>
            <button
              onClick={() => setShowTargetModal(true)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {t.btnEditTarget}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center bg-stone-50/80 p-3 rounded-xl border border-stone-200/60 dark:bg-stone-800/60 dark:border-stone-700/60">
              <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">{t.labelTotalDays}</span>
              <span className="font-mono font-bold text-stone-900 dark:text-white text-sm">{qada?.total_required || 0} hari</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-stone-100 p-2.5 dark:border-stone-800">
                <span className="text-stone-400 block mb-0.5 text-[11px]">{t.completedLabel}</span>
                <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs">{qada?.total_completed || 0} hari</span>
              </div>
              <div className="rounded-xl border border-stone-100 p-2.5 dark:border-stone-800">
                <span className="text-stone-400 block mb-0.5 text-[11px]">{t.remainingLabel}</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">{qada?.remaining || 0} hari</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Peringatan & Notifikasi */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.reminderTitle}</span>
            </h2>
            
            {/* Switch toggle */}
            <button
              type="button"
              onClick={handleToggleReminder}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                reminderConfig.enabled ? 'bg-emerald-600' : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  reminderConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                {t.labelReminderDays}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleReminderDaysChange([1, 4])}
                  className={`rounded-xl p-2 text-xs font-semibold transition border cursor-pointer ${
                    reminderConfig.days.length === 2 && reminderConfig.days.includes(1) && reminderConfig.days.includes(4)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  {t.mondayThursdayPreset}
                </button>
                <button
                  type="button"
                  onClick={() => handleReminderDaysChange([0, 1, 2, 3, 4, 5, 6])}
                  className={`rounded-xl p-2 text-xs font-semibold transition border cursor-pointer ${
                    reminderConfig.days.length === 7
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  {t.dailyPreset}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelReminderTime}
              </label>
              <input
                type="time"
                value={reminderConfig.time}
                onChange={(e) => handleReminderTimeChange(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-1.5 text-xs font-mono text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => onTriggerTestReminder(t.reminderNotificationText)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 transition cursor-pointer"
            >
              {t.btnTestNotification}
            </button>
          </div>
        </div>

        {/* 6. Paparan & Bahasa */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.sectionAppearance}</span>
            </h2>
          </div>

          <div className="mt-4 space-y-3.5">
            {/* Theme selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                {t.labelTheme}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-semibold border cursor-pointer ${
                    theme === 'light'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>{t.themeLight}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-semibold border cursor-pointer ${
                    theme === 'dark'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>{t.themeDark}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-semibold border cursor-pointer ${
                    theme === 'system'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t.themeSystem}</span>
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                {t.labelLanguage}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('ms')}
                  className={`rounded-xl p-2 text-xs font-semibold border cursor-pointer ${
                    language === 'ms'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  🇲🇾 Bahasa Melayu
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-xl p-2 text-xs font-semibold border cursor-pointer ${
                    language === 'en'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Sandaran & Eksport Data */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 pb-3.5 dark:border-stone-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t.sectionData}</span>
            </h2>
          </div>

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.btnExportData}</span>
            </button>

            <label className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 transition cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>{t.btnImportData}</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            {importStatus && (
              <p className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {importStatus}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.btnResetData}</span>
            </button>
          </div>
        </div>

        {/* 8. Sesi Akaun & Log Keluar (Khusus Mobile & Desktop) */}
        {onLogout && (
          <div className="md:col-span-2 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 shrink-0">
                  <img
                    src={profileAvatar || currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileUsername)}`}
                    alt={profileName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                      {profileName}
                    </h3>
                    <span className="text-[10px] text-stone-400 font-mono">@{profileUsername}</span>
                    {currentUser?.role === 'admin' && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {language === 'ms' 
                      ? 'Log keluar daripada akaun anda pada peranti ini dengan selamat.' 
                      : 'Safely sign out of your account on this device.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="settings-bottom-logout-btn"
                onClick={onLogout}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-bold shadow-2xs transition active:scale-[0.98] cursor-pointer shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.btnLogout}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: EDIT TARGET */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              {t.editTargetTitle}
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {t.editTargetDesc}
            </p>

            <form onSubmit={handleSaveTarget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {t.labelTotalDays}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={targetInput}
                  onChange={(e) => setTargetInput(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-base font-mono font-bold text-emerald-700 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-emerald-300"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 cursor-pointer"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-600 transition cursor-pointer"
                >
                  {t.btnSaveRecord}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE APPS SCRIPT CODE VIEWER */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Table className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.appsScriptModalTitle}</span>
              </h3>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-stone-600 dark:text-stone-300">
              {t.appsScriptModalDesc}
            </p>

            <div className="mt-3 flex-1 overflow-auto rounded-xl bg-stone-900 p-3 text-stone-200 border border-stone-800 font-mono text-[11px] leading-relaxed">
              <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[11px] text-stone-500">
                Langkah: Extensions &gt; Apps Script &gt; Paste &gt; Deploy as Web App.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-600 transition cursor-pointer"
                >
                  {copiedScript ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedScript ? 'Tersalin!' : t.btnCopyScript}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAppsScriptModal(false)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET DATA CONFIRMATION */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              {t.resetWarningTitle}
            </h3>
            <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {t.resetWarningDesc}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  onResetAllData();
                  onShowToast('Semua data telah diset semula.', 'info');
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition cursor-pointer"
              >
                {t.btnConfirmReset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INSTALL APP (PWA GUIDE) */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        language={language}
        onNativeInstall={handleInstallClick}
        canNativeInstall={!!deferredPrompt}
        isStandalone={isStandalone}
      />

    </div>
  );
};
