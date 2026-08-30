import React, { useMemo, useState } from 'react';
import { Plus, Calendar as CalendarIcon, ChevronRight, Zap, Download, Sparkles, CheckCircle2, ArrowUpRight, Share2, BookOpen, ExternalLink, ShieldCheck, Target } from 'lucide-react';
import { QadaRecord, DailyRecord, Language, NavigationTab } from '../types';
import { getTranslation } from '../translations';
import { formatDateMalay, getTodayDateString } from '../utils/date';
import { exportAllDataAsJSON } from '../utils/storage';
import { GuidanceModal } from './GuidanceModal';

interface DashboardProps {
  qada: QadaRecord;
  records: DailyRecord[];
  totalRequired: number;
  totalCompleted: number;
  remaining: number;
  progressPercent: number;
  isCompleted: boolean;
  language: Language;
  userName?: string;
  onOpenAddModal: () => void;
  onQuickLogToday: () => void;
  setCurrentTab: (tab: NavigationTab) => void;
  onEditRecord: (record: DailyRecord) => void;
  onOpenShareModal?: () => void;
  onOpenSetNewTarget?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  qada,
  records,
  totalRequired,
  totalCompleted,
  remaining,
  progressPercent,
  isCompleted,
  language,
  userName = 'Ahmad',
  onOpenAddModal,
  onQuickLogToday,
  setCurrentTab,
  onEditRecord,
  onOpenShareModal,
  onOpenSetNewTarget,
}) => {
  const t = getTranslation(language);

  // Take the 3 most recent records for the dashboard snippet
  const recentRecords = records.slice(0, 3);

  // Mini calendar data for current month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const todayStr = getTodayDateString();

  const miniCalendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // Map of record dates for quick lookup
    const recordedDates = new Set(records.map((r) => r.date));

    const cells: Array<{
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasRecord: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasRecord: recordedDates.has(dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasRecord: recordedDates.has(dateStr),
      });
    }

    return cells;
  }, [currentYear, currentMonth, records, todayStr]);

  const handleExport = () => {
    const json = exportAllDataAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qadatrack-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showGuidanceModal, setShowGuidanceModal] = useState(false);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Guidance Modal */}
      <GuidanceModal
        isOpen={showGuidanceModal}
        onClose={() => setShowGuidanceModal(false)}
        language={language}
      />
      
      {/* Top Bismillah & Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-5 dark:border-stone-800">
        <div>
          <p className="font-amiri text-lg text-emerald-800 dark:text-emerald-400/90 tracking-wide select-none mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white font-sans">
            {language === 'ms' ? `Assalamualaikum, ${userName || 'Ahmad'}` : `Welcome, ${userName || 'Ahmad'}`}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {language === 'ms'
              ? 'Jejak dan tunaikan kewajipan puasa ganti anda dengan teratur.'
              : 'Keep track and fulfill your makeup fasting obligations with ease.'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {onOpenShareModal && (
            <button
              id="header-share-btn"
              onClick={onOpenShareModal}
              title={t.btnShareReport}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60 transition cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.btnShare}</span>
            </button>
          )}

          <button
            id="header-export-btn"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-750 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-stone-400" />
            <span>{t.btnExportData}</span>
          </button>

          <button
            id="header-add-record-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>{t.btnRecordQada}</span>
          </button>
        </div>
      </div>

      {/* 100% Completion Celebration Banner */}
      {isCompleted && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-5 text-stone-900 shadow-2xs dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-300/40">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-block rounded-md bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300/40 mb-1">
                  100% {language === 'ms' ? 'Selesai' : 'Completed'}
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-white">
                  {t.congratsTitle}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl">
                  {t.congratsSub}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end shrink-0">
              {onOpenSetNewTarget && (
                <button
                  id="dashboard-new-target-banner-btn"
                  onClick={onOpenSetNewTarget}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <Target className="h-4 w-4" />
                  <span>{t.btnSetNewTarget}</span>
                </button>
              )}

              <button
                id="dashboard-view-summary-btn"
                onClick={() => setCurrentTab('progress')}
                className="rounded-xl bg-stone-900 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300 transition cursor-pointer"
              >
                {language === 'ms' ? 'Lihat Ringkasan Penuh' : 'View Full Summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12-Column Grid Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Main Balance Hero Card */}
          <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-2xs dark:border-stone-800 dark:bg-stone-900 transition-colors">
            
            {/* Subtle background Islamic watermark pattern */}
            <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 pointer-events-none opacity-4 dark:opacity-6 text-stone-900 dark:text-white">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M50 5 L95 50 L50 95 L5 50 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-3 border border-stone-200/70 dark:border-stone-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>{t.bakiPuasaTitle}</span>
              </div>

              {/* Numerical Figure */}
              <div className="my-1 flex items-baseline justify-center gap-2.5 font-mono">
                <span className="text-6xl sm:text-7xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {remaining}
                </span>
                <span className="text-lg sm:text-xl font-medium text-stone-400 uppercase tracking-wider font-sans">
                  {t.daysUnit}
                </span>
              </div>

              {/* Progress Track & Numeric Details */}
              <div className="w-full max-w-md mt-6">
                <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
                  <span>{language === 'ms' ? 'Progres Keseluruhan' : 'Overall Progress'}</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{progressPercent}%</span>
                </div>

                <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/70 dark:bg-stone-800 dark:border-stone-700">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between mt-2.5 text-[11px] font-medium text-stone-400 dark:text-stone-400">
                  <span>{language === 'ms' ? `Telah Selesai: ${totalCompleted} Hari` : `Completed: ${totalCompleted} Days`}</span>
                  <span>{language === 'ms' ? `Sasaran: ${totalRequired} Hari` : `Target: ${totalRequired} Days`}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-7 flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
                {isCompleted && onOpenSetNewTarget ? (
                  <button
                    id="dashboard-hero-new-target-btn"
                    onClick={onOpenSetNewTarget}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white py-3 px-4 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Target className="h-4 w-4" />
                    <span>{t.btnSetNewTarget}</span>
                  </button>
                ) : (
                  <button
                    id="dashboard-primary-add-btn"
                    onClick={onOpenAddModal}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white py-3 px-4 text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>{t.btnRecordQada}</span>
                  </button>
                )}

                {!isCompleted && (
                  <button
                    id="dashboard-quick-log-today-btn"
                    onClick={onQuickLogToday}
                    className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 py-3 px-4 text-xs font-bold dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-750 dark:text-stone-200 transition active:scale-[0.98] cursor-pointer shadow-2xs"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>{t.quickActionToday}</span>
                  </button>
                )}

                {onOpenShareModal && (
                  <button
                    id="dashboard-hero-share-btn"
                    onClick={onOpenShareModal}
                    title={t.btnShareReport}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-3 px-4 text-xs font-bold dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-200 transition active:scale-[0.98] cursor-pointer shadow-2xs"
                  >
                    <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.btnShare}</span>
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* 2-Column Split: Rekod Terakhir & Status Semasa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Rekod Terakhir */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 dark:bg-stone-900 dark:border-stone-800 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>{language === 'ms' ? 'Rekod Terkini' : 'Recent Logs'}</span>
                  </h3>
                  {records.length > 0 && (
                    <button
                      onClick={() => setCurrentTab('history')}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{t.viewAllHistory}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {recentRecords.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500 py-6 text-center">
                    {t.noRecentRecords}
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {recentRecords.map((record) => (
                      <li
                        key={record.id}
                        onClick={() => onEditRecord(record)}
                        className="flex justify-between items-center bg-stone-50/80 p-2.5 rounded-xl border border-stone-200/60 hover:border-stone-300 dark:bg-stone-800/60 dark:border-stone-700/60 dark:hover:border-stone-600 transition cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                            {formatDateMalay(record.date, language)}
                          </p>
                          <p className="text-[10px] text-stone-400 italic truncate">
                            {record.notes || (language === 'ms' ? 'Puasa qada selesai' : 'Fasting completed')}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                          +{record.days} {t.dayUnitSingular}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Status Semasa Card */}
            <div className="bg-stone-900 p-5 rounded-2xl text-stone-100 border border-stone-800 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="text-stone-400 font-bold text-[11px] mb-3.5 uppercase tracking-wider">
                  {language === 'ms' ? 'Status Semasa' : 'Current Status'}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 text-xs">
                      {language === 'ms' ? 'Sasaran Selesai' : 'Target'}
                    </span>
                    <span className="font-semibold text-xs text-emerald-400">
                      {remaining === 0 
                        ? (language === 'ms' ? 'Selesai Penuh!' : 'Completed!') 
                        : (language === 'ms' ? 'Sebelum Ramadan 1448H' : 'Before Ramadan 1448H')}
                    </span>
                  </div>

                  <div className="h-px bg-stone-800" />

                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 text-xs">
                      {language === 'ms' ? 'Jumlah Log' : 'Logged Sessions'}
                    </span>
                    <span className="font-mono font-bold text-xs text-stone-200">
                      {records.length} {language === 'ms' ? 'Sesi' : 'Logs'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span>{language === 'ms' ? 'Baki Diperlukan' : 'Days Left'}:</span>
                <span className="font-mono font-bold text-amber-400">{remaining} {t.dayUnitSingular}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Mini Calendar Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs dark:bg-stone-900 dark:border-stone-800 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                <CalendarIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.months[currentMonth]} {currentYear}</span>
              </h3>
              <button
                onClick={() => setCurrentTab('calendar')}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{language === 'ms' ? 'Lihat Semua' : 'View All'}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {t.daysShort.map((day) => (
                <span key={day} className="text-[10px] text-stone-400 font-semibold uppercase">
                  {day.slice(0, 2)}
                </span>
              ))}
            </div>

            {/* Calendar grid cells */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono">
              {miniCalendarDays.slice(0, 35).map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTab('calendar')}
                  className={`h-7 w-7 mx-auto flex items-center justify-center text-[11px] rounded-lg transition cursor-pointer ${
                    cell.hasRecord
                      ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : cell.isToday
                      ? 'bg-stone-900 text-white font-bold dark:bg-stone-100 dark:text-stone-900'
                      : cell.isCurrentMonth
                      ? 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                      : 'text-stone-300 dark:text-stone-600'
                  }`}
                >
                  {cell.dayNum}
                </button>
              ))}
            </div>

            <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>{language === 'ms' ? 'Selesai Puasa' : 'Fasted'}</span>
              </div>
              <button
                onClick={() => setCurrentTab('calendar')}
                className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {language === 'ms' ? 'Kalendar Penuh →' : 'Full Calendar →'}
              </button>
            </div>
          </div>

          {/* Amalan & Peringatan Card (Bespoke Editorial Card with Verified Sources) */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-100/70 p-5 dark:border-stone-800 dark:bg-stone-900/70 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>{language === 'ms' ? 'Peringatan & Panduan Fiqh' : 'Fasting Guidance'}</span>
              </p>
              <button
                onClick={() => setShowGuidanceModal(true)}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{language === 'ms' ? 'Lihat Semua' : 'View All'}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="rounded-xl bg-white/80 dark:bg-stone-800/80 p-3 border border-stone-200/60 dark:border-stone-700/60">
              <p className="font-amiri text-sm font-bold text-emerald-900 dark:text-emerald-300 text-center mb-1">
                فَدَيْنُ اللَّهِ أَحَقُّ أَنْ يُقْضَى
              </p>
              <p className="text-xs font-serif italic text-stone-800 dark:text-stone-200 leading-relaxed text-center">
                {language === 'ms'
                  ? '"Hutang kepada Allah Taala lebih berhak untuk dilunaskan."'
                  : '"A debt to Allah has more right to be paid."'}
              </p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 text-center mt-1">
                — Sahih al-Bukhari No. 1953 (YADIM & SemakHadis)
              </p>
            </div>

            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
              {language === 'ms'
                ? 'Fatwa PMWP: Harus menggabungkan niat puasa ganti Ramadan bersama puasa sunat Isnin, Khamis atau Hari Putih untuk menggandakan ganjaran.'
                : 'PMWP Fatwa: Combining intentions of makeup fasts with Sunnah Monday/Thursday fasts is permissible and rewarded.'}
            </p>

            {/* Verified Source Links */}
            <div className="pt-2.5 border-t border-stone-200/60 dark:border-stone-800/60">
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{t.guidanceAuthenticSources}</span>
              </p>
              <div className="flex flex-col gap-1 text-[11px]">
                <a
                  href="https://www.muftiwp.gov.my/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center justify-between"
                >
                  <span>1. Pejabat Mufti Wilayah Persekutuan</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://www.yadim.com.my/v2/shahih-bukhari-mengenai-puasa-ramadhan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center justify-between"
                >
                  <span>2. YADIM (Sahih Bukhari Puasa)</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://semakhadis.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-600 dark:text-stone-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline flex items-center justify-between"
                >
                  <span>3. SemakHadis.com</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowGuidanceModal(true)}
              className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t.btnReadGuidance}</span>
            </button>
          </div>

        </div>

      </section>

    </div>
  );
};
