import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, History, Plus, Settings } from 'lucide-react';
import { NavigationTab, Language } from '../types';
import { getTranslation } from '../translations';

interface BottomNavProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  language: Language;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  language,
  onOpenAddModal,
}) => {
  const t = getTranslation(language);

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'calendar', label: t.navCalendar, icon: CalendarIcon },
    { id: 'record_btn', label: t.navRecord, isAction: true },
    { id: 'history', label: t.navHistory, icon: History },
    { id: 'settings', label: t.navSettings, icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/80 bg-stone-50/95 backdrop-blur-lg px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] dark:border-stone-800 dark:bg-stone-950/95 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <button
                key="action-add"
                id="mobile-bottom-nav-add-btn"
                onClick={onOpenAddModal}
                className="-mt-5 flex flex-col items-center group focus:outline-none cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-transform active:scale-95 group-hover:scale-105 border-4 border-stone-50 dark:border-stone-950">
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className="mt-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                  {item.label}
                </span>
              </button>
            );
          }

          const Icon = item.icon!;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setCurrentTab(item.id as NavigationTab)}
              className={`flex flex-1 flex-col items-center py-1.5 transition-colors cursor-pointer ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              <span className="mt-1 text-[10px] font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
