import React from 'react';
import { TrendingUp, CheckCircle2, Award, Calendar, BarChart3, Clock, Sparkles, Share2 } from 'lucide-react';
import { QadaRecord, DailyRecord, Language } from '../types';
import { getTranslation } from '../translations';

interface ProgressViewProps {
  qada: QadaRecord;
  records: DailyRecord[];
  totalRequired: number;
  totalCompleted: number;
  remaining: number;
  progressPercent: number;
  isCompleted: boolean;
  language: Language;
  onOpenShareModal?: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  qada,
  records,
  totalRequired,
  totalCompleted,
  remaining,
  progressPercent,
  isCompleted,
  language,
  onOpenShareModal,
}) => {
  const t = getTranslation(language);

  // Group days by month for the monthly breakdown
  const monthlyStats = React.useMemo(() => {
    const map = new Map<string, { totalDays: number; count: number }>();
    records.forEach((r) => {
      if (r.date) {
        const [year, month] = r.date.split('-');
        const key = `${year}-${month}`;
        const existing = map.get(key) || { totalDays: 0, count: 0 };
        existing.totalDays += r.days;
        existing.count += 1;
        map.set(key, existing);
      }
    });

    return Array.from(map.entries())
      .map(([key, val]) => {
        const [year, month] = key.split('-');
        const monthIndex = parseInt(month, 10) - 1;
        const monthName = t.months[monthIndex] || month;
        return {
          key,
          label: `${monthName} ${year}`,
          totalDays: val.totalDays,
          count: val.count,
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [records, t.months]);

  // Circular gauge SVG calculations
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2.5 font-sans">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.progressPageTitle}</span>
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {t.progressPageSubtitle}
          </p>
        </div>

        {onOpenShareModal && (
          <button
            type="button"
            id="progress-share-report-btn"
            onClick={onOpenShareModal}
            className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60 transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.btnShareReport}</span>
          </button>
        )}
      </div>

      {/* Main Circular Progress Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-2xs dark:border-stone-800 dark:bg-stone-900 text-center">
        
        <div className="flex flex-col items-center justify-center">
          
          {/* Circular SVG Gauge */}
          <div className="relative flex items-center justify-center my-3">
            <svg className="h-48 w-48 -rotate-90 transform" viewBox="0 0 180 180">
              {/* Background Track */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="stroke-stone-100 dark:stroke-stone-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Progress Animated Circle */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="stroke-emerald-600 dark:stroke-emerald-500 transition-all duration-1000 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-mono font-bold text-stone-900 dark:text-white tracking-tight">
                {progressPercent}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mt-0.5">
                {language === 'ms' ? 'Selesai' : 'Completed'}
              </span>
            </div>
          </div>

          {/* Progress Subtitle */}
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white mt-1">
            {totalCompleted} {language === 'ms' ? 'daripada' : 'out of'} {totalRequired} {t.dayUnitSingular} {language === 'ms' ? 'telah diganti' : 'completed'}
          </h2>

          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {remaining > 0
              ? `${remaining} ${t.dayUnitSingular} ${language === 'ms' ? 'masih berbaki untuk dilunaskan.' : 'remaining to complete.'}`
              : t.congratsTitle}
          </p>

        </div>

      </div>

      {/* 4-Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-sans">
        
        {/* Total Required */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {t.statCardRequired}
            </span>
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <p className="text-2xl font-mono font-bold text-stone-900 dark:text-white">
            {totalRequired}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">{t.dayUnitSingular} sasaran asal</p>
        </div>

        {/* Total Completed */}
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              {t.statCardDone}
            </span>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {totalCompleted}
          </p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">{t.dayUnitSingular} disempurnakan</p>
        </div>

        {/* Remaining */}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              {t.statCardRemaining}
            </span>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <p className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-400">
            {remaining}
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">{t.dayUnitSingular} berbaki</p>
        </div>

        {/* Total Sessions / Logs */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              {t.statCardTotalLogs}
            </span>
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          <p className="text-2xl font-mono font-bold text-stone-900 dark:text-white">
            {records.length}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">{language === 'ms' ? 'catatan dibuat' : 'log entries'}</p>
        </div>

      </div>

      {/* Monthly Breakdown */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t.progressBreakdownTitle}</span>
        </h3>

        {monthlyStats.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
            {t.noRecentRecords}
          </div>
        ) : (
          <div className="space-y-3.5">
            {monthlyStats.map((item) => {
              const maxMonthDays = Math.max(...monthlyStats.map((m) => m.totalDays), 1);
              const barPercent = Math.min(100, Math.round((item.totalDays / maxMonthDays) * 100));

              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                    <span>{item.label}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                      {item.totalDays} {t.dayUnitSingular} ({item.count} {language === 'ms' ? 'sesi' : 'entries'})
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivation Tip Card */}
      <div className="rounded-2xl border border-stone-200/80 bg-stone-100/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-wider">
              {t.estimatedCompletionTitle}
            </h4>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {t.fastPaceTip}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
