import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  QadaRecord, DailyRecord, UserSettings, NavigationTab, Language, ThemeMode, User, AdminUserItem 
} from './types';
import { 
  getQadaRecord, saveQadaRecord, getDailyRecords, saveDailyRecords, 
  getInitialSettings, saveSettings, calculateQadaStats, resetAllData 
} from './utils/storage';
import { getTranslation } from './translations';
import { getTodayDateString } from './utils/date';
import { authApi, qadaApi, getStoredToken, removeStoredToken } from './utils/api';
import { syncToGoogleSheetWebhook } from './utils/googleSheets';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { CalendarView } from './components/CalendarView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { AddRecordModal } from './components/AddRecordModal';
import { CelebrationModal } from './components/CelebrationModal';
import { AuthView } from './components/AuthView';
import { AdminUsersModal } from './components/AdminUsersModal';
import { ShareReportModal } from './components/ShareReportModal';
import { SetNewTargetModal } from './components/SetNewTargetModal';
import { Footer } from './components/Footer';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // App data state - Strictly isolated per user
  const [qada, setQada] = useState<QadaRecord | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => getInitialSettings());
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  // Modals & overlay state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [addModalInitialDate, setAddModalInitialDate] = useState<string | undefined>(undefined);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState<boolean>(false);
  const [isSetNewTargetOpen, setIsSetNewTargetOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [customShareUser, setCustomShareUser] = useState<AdminUserItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const t = getTranslation(settings.language);

  // Toast notification helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync theme to DOM (light, dark, system)
  useEffect(() => {
    const applyTheme = () => {
      const isDark = settings.theme === 'dark' || 
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Load User Data from Server with strict user isolation
  const loadUserDataFromServer = useCallback(async (explicitUser?: User | null) => {
    const activeUser = explicitUser !== undefined ? explicitUser : currentUser;
    const uid = activeUser?.id;
    if (!uid) return;

    try {
      const res = await qadaApi.getData();
      if (res.data) {
        // Explicitly set null if user has not set a target yet, preventing data bleeding
        const serverQada = res.data.qada || null;
        setQada(serverQada);
        saveQadaRecord(serverQada, uid);

        const serverRecords = Array.isArray(res.data.records) ? res.data.records : [];
        setRecords(serverRecords);
        saveDailyRecords(serverRecords, uid);

        if (res.data.settings) {
          setSettings(res.data.settings);
          saveSettings(res.data.settings, uid);
        }
      }
    } catch (e) {
      console.warn('Backend sync failed, using local user cache:', e);
      if (uid) {
        setQada(getQadaRecord(uid));
        setRecords(getDailyRecords(uid));
        setSettings(getInitialSettings(uid));
      }
    }
  }, [currentUser]);

  // Initial Auth Check on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsAuthChecking(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.data?.user) {
          const user = res.data.user;
          setCurrentUser(user);
          setQada(getQadaRecord(user.id));
          setRecords(getDailyRecords(user.id));
          setSettings(getInitialSettings(user.id));
          await loadUserDataFromServer(user);
        } else {
          setCurrentUser(null);
          setQada(null);
          setRecords([]);
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
        setCurrentUser(null);
        setQada(null);
        setRecords([]);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, [loadUserDataFromServer]);

  // Real-Time Multi-Device Synchronization (Window focus & Periodic Polling)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Sync immediately when user switches tabs or returns to the app
    const handleFocusSync = () => {
      loadUserDataFromServer();
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        loadUserDataFromServer();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleVisibilitySync);

    // 2. Continuous real-time synchronization every 20 seconds
    const interval = setInterval(() => {
      loadUserDataFromServer();
    }, 20000);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      clearInterval(interval);
    };
  }, [currentUser, loadUserDataFromServer]);

  // Derived dynamic statistics
  const stats = useMemo(() => {
    return calculateQadaStats(qada, records);
  }, [qada, records]);

  // Check if completion milestone reached
  const checkCompletionStatus = useCallback((newStats: ReturnType<typeof calculateQadaStats>, oldStats: ReturnType<typeof calculateQadaStats>) => {
    if (newStats.isCompleted && !oldStats.isCompleted) {
      setIsCelebrationOpen(true);
    }
  }, []);

  // Handle Login Success
  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    // Reset to user's isolated local records if any
    setQada(getQadaRecord(user.id));
    setRecords(getDailyRecords(user.id));
    setSettings(getInitialSettings(user.id));
    await loadUserDataFromServer(user);
  };

  // Handle Logout
  const handleLogout = useCallback(async (reason?: string) => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout warning caught safely:', err);
    }
    removeStoredToken();
    setCurrentUser(null);
    setQada(null);
    setRecords([]);
    setIsAdminModalOpen(false);
    setIsAddModalOpen(false);
    setIsCelebrationOpen(false);
    setIsSetNewTargetOpen(false);
    setIsShareModalOpen(false);
    setEditingRecord(null);
    setCurrentTab('dashboard');
    const msg = reason || (settings.language === 'ms' ? 'Anda telah log keluar.' : 'You have logged out.');
    showToast(msg, 'info');
  }, [settings.language, showToast]);

  // Inactivity Auto-Logout after 30 minutes
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout(
          settings.language === 'ms'
            ? 'Sesi anda telah tamat selepas 30 minit tanpa aktiviti. Sila log masuk semula.'
            : 'Session expired after 30 minutes of inactivity. Please sign in again.'
        );
      }, INACTIVITY_TIMEOUT_MS);
    };

    const userActivityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    userActivityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    // Start timer initially
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      userActivityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [currentUser, handleLogout, settings.language]);

  // Background auto-sync to Google Sheets Database
  const triggerGoogleSheetAutoSync = (
    currentQada: QadaRecord | null,
    currentRecords: DailyRecord[],
    actionName: string
  ) => {
    if (settings.googleSheetWebhookUrl) {
      syncToGoogleSheetWebhook(
        settings.googleSheetWebhookUrl,
        currentUser,
        currentQada,
        currentRecords,
        actionName
      ).catch((e) => console.warn('Background Google Sheet sync:', e));
    }
  };

  // Handle Onboarding Completion
  const handleOnboardingComplete = async (newQada: QadaRecord) => {
    const userQada: QadaRecord = {
      ...newQada,
      id: `qada_${currentUser?.id || Date.now()}`,
      user_id: currentUser?.id || 'user_default',
    };
    saveQadaRecord(userQada, currentUser?.id);
    setQada(userQada);
    await qadaApi.saveTarget(userQada);
    triggerGoogleSheetAutoSync(userQada, records, 'Tetapan Sasaran Awal');
    showToast(t.setupSuccess, 'success');
  };

  // Handle Open Add Record Modal
  const handleOpenAddModal = (dateStr?: string) => {
    setEditingRecord(null);
    setAddModalInitialDate(dateStr || getTodayDateString());
    setIsAddModalOpen(true);
  };

  // Handle Open Edit Record Modal
  const handleOpenEditModal = (record: DailyRecord) => {
    setEditingRecord(record);
    setAddModalInitialDate(record.date);
    setIsAddModalOpen(true);
  };

  // Handle Save Record (Add or Update)
  const handleSaveRecord = async (recordData: Omit<DailyRecord, 'id' | 'qada_record_id' | 'created_at' | 'updated_at'>) => {
    if (!qada) return;

    const previousStats = stats;
    let updatedRecords: DailyRecord[];

    if (editingRecord) {
      // Update existing record
      updatedRecords = records.map((r) => {
        if (r.id === editingRecord.id) {
          return {
            ...r,
            ...recordData,
            updated_at: new Date().toISOString(),
          };
        }
        return r;
      });
      showToast(t.recordUpdatedToast, 'success');
    } else {
      // Create new daily record
      const newRecord: DailyRecord = {
        id: 'rec_' + Date.now(),
        qada_record_id: qada.id,
        date: recordData.date,
        days: recordData.days,
        notes: recordData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updatedRecords = [newRecord, ...records];
      showToast(t.recordSavedToast.replace('{days}', String(recordData.days)), 'success');
    }

    saveDailyRecords(updatedRecords, currentUser?.id);
    setRecords(updatedRecords);
    setIsAddModalOpen(false);
    setEditingRecord(null);

    // Persist to server
    await qadaApi.saveRecords(updatedRecords);

    // Auto-sync to Google Sheet Database
    triggerGoogleSheetAutoSync(qada, updatedRecords, editingRecord ? 'Kemaskini Rekod' : 'Tambah Rekod');

    // Check if achieved 100%
    const newStats = calculateQadaStats(qada, updatedRecords);
    checkCompletionStatus(newStats, previousStats);
  };

  // Quick 1-tap log for today
  const handleQuickLogToday = () => {
    if (!qada) return;
    const today = getTodayDateString();
    
    handleSaveRecord({
      date: today,
      days: 1,
      notes: settings.language === 'ms' ? 'Puasa Ganti Hari Ini' : 'Today’s Makeup Fast',
    });
  };

  // Handle Delete Record
  const handleDeleteRecord = async (recordId: string) => {
    const updatedRecords = records.filter((r) => r.id !== recordId);
    saveDailyRecords(updatedRecords, currentUser?.id);
    setRecords(updatedRecords);
    await qadaApi.saveRecords(updatedRecords);
    triggerGoogleSheetAutoSync(qada, updatedRecords, 'Padam Rekod');
    showToast(t.recordDeletedToast, 'info');
  };

  // Handle Update Target (Total Required)
  const handleUpdateTarget = async (newTotal: number) => {
    if (!qada) return;
    const updatedQada: QadaRecord = {
      ...qada,
      total_required: newTotal,
      updated_at: new Date().toISOString(),
    };
    saveQadaRecord(updatedQada, currentUser?.id);
    setQada(updatedQada);
    await qadaApi.saveTarget(updatedQada);
    triggerGoogleSheetAutoSync(updatedQada, records, 'Kemaskini Sasaran');
    showToast(settings.language === 'ms' ? 'Sasaran puasa ganti berjaya dikemaskini!' : 'Target days updated successfully!', 'success');
  };

  // Handle Save New Target (Post 100% Completion Cycle or Reset)
  const handleSaveNewTarget = async (newTotalRequired: number, year?: string, notes?: string) => {
    const updatedQada: QadaRecord = {
      id: qada?.id || (`qada_${currentUser?.id || Date.now()}`),
      user_id: currentUser?.id || ('user_' + Date.now()),
      total_required: newTotalRequired,
      total_completed: stats.totalCompleted,
      remaining: Math.max(0, newTotalRequired - stats.totalCompleted),
      year: year || qada?.year || 'Ramadan 1447H / 2026',
      notes: notes !== undefined ? notes : (qada?.notes || ''),
      created_at: qada?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveQadaRecord(updatedQada, currentUser?.id);
    setQada(updatedQada);
    await qadaApi.saveTarget(updatedQada);
    triggerGoogleSheetAutoSync(updatedQada, records, 'Tetapkan Sasaran Baharu');
    showToast(
      settings.language === 'ms'
        ? `Sasaran baharu berjaya ditetapkan (${newTotalRequired} hari).`
        : `New target successfully set (${newTotalRequired} days).`,
      'success'
    );
  };

  // Handle Update Settings
  const handleUpdateSettings = async (newSettings: UserSettings) => {
    saveSettings(newSettings, currentUser?.id);
    setSettings(newSettings);
    if (currentUser) {
      try {
        await qadaApi.saveSettings(newSettings);
      } catch (e) {
        console.warn('Could not sync settings to server:', e);
      }
    }
  };

  // Handle Language toggle
  const handleSetLanguage = (newLang: Language) => {
    const updated: UserSettings = {
      ...settings,
      language: newLang,
    };
    handleUpdateSettings(updated);
  };

  // Handle Theme toggle
  const handleSetTheme = (newTheme: ThemeMode) => {
    const updated: UserSettings = {
      ...settings,
      theme: newTheme,
    };
    handleUpdateSettings(updated);
  };

  // Handle Reset All Data
  const handleResetAllData = async () => {
    resetAllData(currentUser?.id);
    setQada(null);
    setRecords([]);
    setCurrentTab('dashboard');
    await qadaApi.resetData();
    showToast(settings.language === 'ms' ? 'Semua data telah diset semula.' : 'All data has been reset.', 'info');
  };

  // Handle Trigger Test Reminder
  const handleTriggerTestReminder = (message: string) => {
    showToast(`🌙 ${message}`, 'success');
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🌙 KiraPuasaKu Peringatan', {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Notification error', e);
      }
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  // Loading spinner during auth check
  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <img
            src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
            alt="KiraPuasaKu"
            className="h-16 w-16 object-contain animate-pulse"
            referrerPolicy="no-referrer"
          />
          <p className="text-xs font-bold text-stone-500 dark:text-stone-400">
            Memuatkan KiraPuasaKu...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Authentication / Register Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors relative selection:bg-emerald-500 selection:text-white">
        {/* Subtle background ambient glow for modern depth */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-10 w-[350px] h-[350px] bg-amber-500/5 dark:bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <main className="flex-1 flex items-center justify-center p-3 sm:p-6 relative z-10">
          <AuthView
            language={settings.language}
            theme={settings.theme}
            onSetLanguage={handleSetLanguage}
            onSetTheme={handleSetTheme}
            onLoginSuccess={handleLoginSuccess}
            onShowToast={showToast}
          />
        </main>

        <Footer />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Logged in: Main Application
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        language={settings.language}
        setLanguage={handleSetLanguage}
        theme={settings.theme}
        setTheme={handleSetTheme}
        remainingDays={stats.remaining}
        totalRequired={stats.totalRequired}
        hasQadaRecord={!!qada}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdminUsers={() => setIsAdminModalOpen(true)}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex mx-auto max-w-7xl w-full">
        
        {/* Desktop Sidebar (visible on md+) */}
        {qada && (
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            language={settings.language}
            onOpenAddModal={() => handleOpenAddModal()}
            remainingDays={stats.remaining}
            totalRequired={stats.totalRequired}
            totalCompleted={stats.totalCompleted}
            progressPercent={stats.progressPercent}
            hasQadaRecord={!!qada}
            currentUser={currentUser}
            onOpenAdminUsers={() => setIsAdminModalOpen(true)}
            onLogout={handleLogout}
          />
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-12">
          {!qada ? (
            /* First-time Setup / Onboarding Screen */
            <Onboarding
              language={settings.language}
              onComplete={handleOnboardingComplete}
            />
          ) : (
            /* Main Views depending on active Tab */
            <>
              {currentTab === 'dashboard' && (
                <Dashboard
                  qada={qada}
                  records={records}
                  totalRequired={stats.totalRequired}
                  totalCompleted={stats.totalCompleted}
                  remaining={stats.remaining}
                  progressPercent={stats.progressPercent}
                  isCompleted={stats.isCompleted}
                  language={settings.language}
                  userName={currentUser?.name || settings.userName}
                  onOpenAddModal={() => handleOpenAddModal()}
                  onQuickLogToday={handleQuickLogToday}
                  setCurrentTab={setCurrentTab}
                  onEditRecord={handleOpenEditModal}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  onOpenSetNewTarget={() => setIsSetNewTargetOpen(true)}
                />
              )}

              {currentTab === 'history' && (
                <HistoryView
                  records={records}
                  language={settings.language}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteRecord}
                  onOpenAddModal={() => handleOpenAddModal()}
                />
              )}

              {currentTab === 'calendar' && (
                <CalendarView
                  records={records}
                  language={settings.language}
                  onSelectDateToRecord={(dateStr) => handleOpenAddModal(dateStr)}
                  onEditRecord={handleOpenEditModal}
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {currentTab === 'progress' && (
                <ProgressView
                  qada={qada}
                  records={records}
                  totalRequired={stats.totalRequired}
                  totalCompleted={stats.totalCompleted}
                  remaining={stats.remaining}
                  progressPercent={stats.progressPercent}
                  isCompleted={stats.isCompleted}
                  language={settings.language}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  qada={qada}
                  records={records}
                  onUpdateTarget={handleUpdateTarget}
                  onResetAllData={handleResetAllData}
                  language={settings.language}
                  setLanguage={handleSetLanguage}
                  theme={settings.theme}
                  setTheme={handleSetTheme}
                  onTriggerTestReminder={handleTriggerTestReminder}
                  currentUser={currentUser}
                  onUserUpdated={(updated) => setCurrentUser(updated)}
                  onLogout={handleLogout}
                  onOpenAdminUsers={() => setIsAdminModalOpen(true)}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </main>

      </div>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation (visible on mobile only) */}
      {qada && (
        <BottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          language={settings.language}
          onOpenAddModal={() => handleOpenAddModal()}
        />
      )}

      {/* Add / Edit Record Modal */}
      {qada && (
        <AddRecordModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
          editingRecord={editingRecord}
          remainingDays={stats.remaining}
          qadaRecordId={qada.id}
          language={settings.language}
          initialDate={addModalInitialDate}
        />
      )}

      {/* 100% Milestone Celebration Modal */}
      <CelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        language={settings.language}
        totalDaysCompleted={stats.totalCompleted}
        onOpenSetNewTarget={() => setIsSetNewTargetOpen(true)}
      />

      {/* Set New Target (Post 100% Completion Goal) Modal */}
      {qada && (
        <SetNewTargetModal
          isOpen={isSetNewTargetOpen}
          onClose={() => setIsSetNewTargetOpen(false)}
          language={settings.language}
          currentCompleted={stats.totalCompleted}
          currentTarget={stats.totalRequired}
          onSaveNewTarget={handleSaveNewTarget}
        />
      )}

      {/* Admin User Management Modal */}
      {currentUser?.role === 'admin' && (
        <AdminUsersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          language={settings.language}
          onShowToast={showToast}
          onOpenShareUser={(u) => {
            setCustomShareUser(u);
            setIsShareModalOpen(true);
          }}
        />
      )}

      {/* Share Report Card Generator Modal */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setCustomShareUser(null);
        }}
        qada={qada}
        records={records}
        totalRequired={customShareUser ? (customShareUser.qadaRequired || 0) : stats.totalRequired}
        totalCompleted={customShareUser ? (customShareUser.qadaCompleted || 0) : stats.totalCompleted}
        remaining={customShareUser ? Math.max(0, (customShareUser.qadaRequired || 0) - (customShareUser.qadaCompleted || 0)) : stats.remaining}
        progressPercent={customShareUser 
          ? (customShareUser.qadaRequired && customShareUser.qadaRequired > 0 
              ? Math.min(100, Math.round(((customShareUser.qadaCompleted || 0) / customShareUser.qadaRequired) * 100)) 
              : 0) 
          : stats.progressPercent}
        language={settings.language}
        currentUser={customShareUser ? { id: customShareUser.id, username: customShareUser.username, name: customShareUser.name, role: customShareUser.role, status: customShareUser.status, email_verified: customShareUser.email_verified, email: customShareUser.email, created_at: customShareUser.created_at } : currentUser}
        userName={customShareUser?.name || currentUser?.name || settings.userName}
        onShowToast={showToast}
      />

      {/* Toast notifications container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}
