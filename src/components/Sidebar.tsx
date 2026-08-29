import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, TrendingUp, History, Settings, Plus, ShieldCheck, LogOut } from 'lucide-react';
import { NavigationTab, Language, User } from '../types';
import { getTranslation } from '../translations';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  onOpenAddModal: () => void;
  remainingDays: number;
  totalRequired: number;
  totalCompleted: number;
  progressPercent: number;
  hasQadaRecord: boolean;
  currentUser?: User | null;
  onOpenAdminUsers?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  language,
  onOpenAddModal,
  remainingDays,
  progressPercent,
  hasQadaRecord,
  currentUser,
  onOpenAdminUsers,
  onLogout,
}) => {
  const t = getTranslation(language);

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'calendar', label: t.navCalendar, icon: CalendarIcon },
    { id: 'history', label: t.navHistory, icon: History },
    { id: 'progress', label: t.navProgress, icon: TrendingUp },
    { id: 'settings', label: t.navSettings, icon: Settings },
  ];

  return (
    <aside className="hidden md:flex md:w-68 md:flex-col md:shrink-0 bg-stone-900 text-stone-200 border-r border-stone-800 transition-colors">
      
      {/* Brand Header & User Profile Preview */}
      <div className="p-5 border-b border-stone-800">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
            alt="KiraPuasaKu"
            className="h-9 w-9 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-lg font-extrabold font-logo select-none">
              <span className="brand-title-kira">Kira</span>
              <span className="brand-title-puasa">Puasa</span>
              <span className="brand-title-ku">Ku</span>
            </h1>
            <p className="text-[11px] text-stone-400 font-normal">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="rounded-xl bg-stone-800/80 p-2.5 border border-stone-700/70 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg overflow-hidden border border-stone-600 bg-stone-900 shrink-0">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username)}`}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-100 truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-400 font-mono">@{currentUser.username}</span>
                  {currentUser.role === 'admin' && (
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={t.btnLogout}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-700 hover:text-stone-100 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      {hasQadaRecord && (
        <div className="px-4 my-3.5">
          <button
            id="sidebar-add-record-btn"
            onClick={onOpenAddModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t.btnRecordQada}</span>
          </button>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setCurrentTab(item.id as NavigationTab)}
              className={`flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-stone-800 text-white font-semibold border border-stone-700/80 shadow-2xs'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-stone-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}

        {/* Admin Link if role is admin */}
        {currentUser?.role === 'admin' && onOpenAdminUsers && (
          <button
            id="sidebar-nav-admin"
            onClick={onOpenAdminUsers}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-stone-800/60 hover:text-amber-200 transition cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span className="flex-1 text-left">{t.navAdmin}</span>
          </button>
        )}
      </nav>

      {/* Progress Card in Sidebar */}
      <div className="p-4 mt-auto border-t border-stone-800">
        {hasQadaRecord && (
          <div className="bg-stone-850 p-3 rounded-xl border border-stone-800">
            <div className="flex justify-between items-center text-[11px] text-stone-400 mb-1">
              <span>{t.bakiPuasaTitle}</span>
              <span className="font-mono font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="text-base font-bold text-white mb-2 font-mono">
              {remainingDays} <span className="text-xs font-medium text-stone-400 uppercase">{t.daysUnit}</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

    </aside>
  );
};
