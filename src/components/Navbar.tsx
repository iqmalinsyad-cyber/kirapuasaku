import React from 'react';
import { Moon, Sun, Globe, Sparkles, LogOut, ShieldCheck } from 'lucide-react';
import { Language, ThemeMode, NavigationTab, User } from '../types';
import { getTranslation } from '../translations';

interface NavbarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  remainingDays: number;
  totalRequired: number;
  hasQadaRecord: boolean;
  currentUser?: User | null;
  onLogout?: () => void;
  onOpenAdminUsers?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  language,
  setLanguage,
  theme,
  setTheme,
  remainingDays,
  hasQadaRecord,
  currentUser,
  onLogout,
  onOpenAdminUsers,
}) => {
  const t = getTranslation(language);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ms' ? 'en' : 'ms');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
        
        {/* Brand Logo & Editorial Title */}
        <button
          id="brand-header-button"
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group cursor-pointer shrink-0"
        >
          <div className="relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden bg-emerald-950/10 dark:bg-emerald-950/40 p-0.5 border border-emerald-700/20 shrink-0 shadow-2xs">
            <img
              src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
              alt="KiraPuasaKu"
              className="h-full w-full object-contain transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-base sm:text-xl font-black font-logo tracking-tight select-none flex items-center leading-none">
                <span className="brand-title-kira">Kira</span>
                <span className="brand-title-puasa">Puasa</span>
                <span className="brand-title-ku">Ku</span>
              </span>
              <span className="hidden xs:inline-flex items-center rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300/80 dark:border-stone-700 font-mono shrink-0">
                1447H
              </span>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-medium whitespace-nowrap hidden sm:block mt-0.5">
              {t.tagline}
            </p>
          </div>
        </button>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Quick Remaining Status Pill */}
          {hasQadaRecord && (
            <button
              id="quick-balance-badge"
              onClick={() => setCurrentTab('dashboard')}
              className="hidden md:flex items-center gap-2 rounded-xl bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800/80 cursor-pointer shadow-2xs shrink-0"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {t.remainingLabel}: <strong className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">{remainingDays} {t.dayUnitSingular}</strong>
              </span>
            </button>
          )}

          {/* Admin User Management Button */}
          {currentUser?.role === 'admin' && onOpenAdminUsers && (
            <button
              id="navbar-admin-btn"
              onClick={onOpenAdminUsers}
              title="Pengurusan Pengguna (Admin)"
              className="flex h-8 w-8 sm:h-9 sm:w-auto items-center justify-center sm:px-3 gap-1.5 rounded-xl bg-stone-900 text-xs font-bold text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 shadow-2xs transition cursor-pointer border border-stone-800 dark:border-stone-200 shrink-0"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
              <span className="hidden md:inline">{t.navAdmin}</span>
            </button>
          )}

          {/* User Profile Pill */}
          {currentUser && (
            <button
              id="navbar-profile-btn"
              onClick={() => setCurrentTab('settings')}
              title={`Profil Pengguna: ${currentUser.name}`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-stone-200 bg-white p-1 sm:pl-1.5 sm:pr-2.5 sm:py-1 text-xs font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-850 transition cursor-pointer shadow-2xs shrink-0"
            >
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 shrink-0">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username)}`}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="max-w-[80px] sm:max-w-[100px] truncate hidden md:inline font-medium">{currentUser.name}</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            id="navbar-language-toggle"
            onClick={toggleLanguage}
            title="Tukar Bahasa / Change Language"
            className="flex h-8 sm:h-9 items-center gap-1 rounded-xl border border-stone-200/90 bg-white px-2 sm:px-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer shadow-2xs shrink-0"
          >
            <Globe className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="font-mono text-[10px] sm:text-[11px]">{language.toUpperCase()}</span>
          </button>

          {/* Theme Switcher */}
          <button
            id="navbar-theme-toggle"
            onClick={toggleTheme}
            title="Tukar Tema / Change Theme"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-stone-200/90 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer shadow-2xs shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-600" />
            )}
          </button>

          {/* Logout Button (Always visible on mobile & desktop) */}
          {currentUser && onLogout && (
            <button
              id="navbar-logout-btn"
              onClick={onLogout}
              title={t.btnLogout}
              aria-label={t.btnLogout}
              className="flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50 px-2 sm:px-2.5 text-rose-700 hover:bg-rose-100 dark:border-rose-900/80 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition cursor-pointer shadow-2xs shrink-0 active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="text-xs font-bold hidden sm:inline">{t.btnLogout}</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
