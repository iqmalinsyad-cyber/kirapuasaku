import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Moon, ExternalLink, ShieldAlert, Sparkles, SlidersHorizontal, Clock, Star } from 'lucide-react';
import { DailyRecord, Language } from '../types';
import { getTranslation } from '../translations';
import { formatDateMalay, getTodayDateString, getDayOfWeekName, getHijriDate, HijriDateInfo, getRamadan1448CountdownInfo } from '../utils/date';

interface CalendarViewProps {
  records: DailyRecord[];
  language: Language;
  onSelectDateToRecord: (dateStr: string) => void;
  onEditRecord: (record: DailyRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  records,
  language,
  onSelectDateToRecord,
  onEditRecord,
  onDeleteRecord,
}) => {
  const t = getTranslation(language);

  const todayStr = getTodayDateString();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [hijriAdjustment, setHijriAdjustment] = useState<number>(0);
  const [now, setNow] = useState<Date>(new Date());

  // Live second updater for Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const ramadan1448Countdown = useMemo(() => {
    return getRamadan1448CountdownInfo(now, language);
  }, [now, language]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 to 11

  // Map records by date for fast lookup
  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailyRecord[]>();
    records.forEach((r) => {
      if (!map.has(r.date)) {
        map.set(r.date, []);
      }
      map.get(r.date)!.push(r);
    });
    return map;
  }, [records]);

  // Generate days in month with Islamic Takwim & Sunnah/Haram data
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasRecords: boolean;
      totalDaysFasted: number;
      hijri: HijriDateInfo;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDaysCount - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const recs = recordsByDate.get(dateStr) || [];
      const totalDaysFasted = recs.reduce((sum, r) => sum + r.days, 0);
      const hijri = getHijriDate(dateStr, hijriAdjustment, language);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
        hijri,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const recs = recordsByDate.get(dateStr) || [];
      const totalDaysFasted = recs.reduce((sum, r) => sum + r.days, 0);
      const hijri = getHijriDate(dateStr, hijriAdjustment, language);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
        hijri,
      });
    }

    // Next month padding to fill grid
    const remainingSlots = 42 - days.length; // 6 rows of 7
    for (let dayNum = 1; dayNum <= remainingSlots; dayNum++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const recs = recordsByDate.get(dateStr) || [];
      const totalDaysFasted = recs.reduce((sum, r) => sum + r.days, 0);
      const hijri = getHijriDate(dateStr, hijriAdjustment, language);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
        hijri,
      });
    }

    return days;
  }, [year, month, recordsByDate, todayStr, hijriAdjustment, language]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
  };

  // Selected date details
  const selectedDateRecords = recordsByDate.get(selectedDate) || [];
  const selectedDateHijri = useMemo(() => {
    return getHijriDate(selectedDate, hijriAdjustment, language);
  }, [selectedDate, hijriAdjustment, language]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2.5 font-sans">
            <CalendarIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.calendarTitle}</span>
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {t.calendarSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Hijri Moon Adjustment */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 shadow-2xs">
            <Moon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-medium hidden sm:inline">{language === 'ms' ? 'Hilal:' : 'Moon:'}</span>
            <button
              onClick={() => setHijriAdjustment((prev) => prev - 1)}
              className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-200 text-[10px] font-bold cursor-pointer"
              title="-1 Hari"
            >
              -1d
            </button>
            <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment}
            </span>
            <button
              onClick={() => setHijriAdjustment((prev) => prev + 1)}
              className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-200 text-[10px] font-bold cursor-pointer"
              title="+1 Hari"
            >
              +1d
            </button>
          </div>

          <button
            id="calendar-today-btn"
            onClick={goToToday}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-750 transition cursor-pointer shadow-2xs"
          >
            <span>{t.today}</span>
          </button>
        </div>
      </div>

      {/* Countdown 1 Ramadan 1448 Hijrah Banner (Selari Takwim JAKIM e-Solat: 8 Feb 2027) */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-medium text-emerald-100 mb-1.5 border border-white/10">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>{language === 'ms' ? 'Hitung Detik Ramadan 1448 Hijrah' : 'Ramadan 1448 Hijri Countdown'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight font-sans text-white flex items-center gap-2">
              <span>{ramadan1448Countdown.targetTitle}</span>
              <span className="text-xs font-normal text-emerald-200/90 font-mono">({ramadan1448Countdown.targetGregorianFormatted})</span>
            </h2>
            <p className="text-xs text-emerald-100/80 mt-0.5 max-w-xl">
              {language === 'ms' 
                ? 'Selari dengan Takwim Hijrah JAKIM e-Solat (1 Ramadan 1448H dijangka jatuh pada 8 Februari 2027).' 
                : 'Aligned with JAKIM e-Solat Takwim (1 Ramadan 1448H expected on 8 February 2027).'}
            </p>
          </div>

          {/* Countdown Clock Units */}
          <div className="flex items-center gap-2 sm:gap-2.5 font-mono">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 backdrop-blur-md px-3 py-2 border border-white/15 min-w-[56px] sm:min-w-[64px]">
              <span className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {ramadan1448Countdown.daysLeft}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-sans font-semibold">
                {language === 'ms' ? 'Hari' : 'Days'}
              </span>
            </div>

            <span className="text-xl font-bold text-emerald-300/70 -mt-2">:</span>

            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 backdrop-blur-md px-3 py-2 border border-white/15 min-w-[50px] sm:min-w-[58px]">
              <span className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {String(ramadan1448Countdown.hoursLeft).padStart(2, '0')}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-sans font-semibold">
                {language === 'ms' ? 'Jam' : 'Hours'}
              </span>
            </div>

            <span className="text-xl font-bold text-emerald-300/70 -mt-2">:</span>

            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 backdrop-blur-md px-3 py-2 border border-white/15 min-w-[50px] sm:min-w-[58px]">
              <span className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {String(ramadan1448Countdown.minutesLeft).padStart(2, '0')}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-sans font-semibold">
                {language === 'ms' ? 'Minit' : 'Min'}
              </span>
            </div>

            <span className="text-xl font-bold text-emerald-300/70 -mt-2">:</span>

            <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur-md px-3 py-2 border border-emerald-400/30 min-w-[50px] sm:min-w-[58px]">
              <span className="text-xl sm:text-2xl font-bold text-amber-300 leading-tight">
                {String(ramadan1448Countdown.secondsLeft).padStart(2, '0')}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200 font-sans font-semibold">
                {language === 'ms' ? 'Saat' : 'Sec'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Calendar Card */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          
          {/* Month Navigation & Current Hijri Month Subtitle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                {t.months[month]} {year}
              </h2>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <Moon className="h-3 w-3" />
                <span>{calendarDays.find(d => d.isCurrentMonth)?.hijri.monthName} {calendarDays.find(d => d.isCurrentMonth)?.hijri.year}H</span>
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="calendar-prev-month"
                onClick={prevMonth}
                aria-label="Previous Month"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id="calendar-next-month"
                onClick={nextMonth}
                aria-label="Next Month"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {t.daysShort.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  idx === 1 || idx === 4 
                    ? 'text-emerald-700 dark:text-emerald-400 font-extrabold' // Sunnah Fasting (Mon & Thu)
                    : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 font-mono">
            {calendarDays.map((dayObj) => {
              const isSelected = dayObj.dateStr === selectedDate;
              const isForbidden = dayObj.hijri.isForbidden;
              const isSunnah = dayObj.hijri.isSunnah;
              
              return (
                <button
                  key={dayObj.dateStr}
                  id={`cal-day-${dayObj.dateStr}`}
                  onClick={() => setSelectedDate(dayObj.dateStr)}
                  className={`group relative flex flex-col items-center justify-between rounded-xl p-1.5 min-h-[58px] sm:min-h-[70px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/90 dark:border-emerald-500 dark:bg-emerald-950/60 shadow-2xs scale-[1.02] z-10'
                      : isForbidden
                      ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/20'
                      : dayObj.hasRecords
                      ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      : isSunnah
                      ? 'border-emerald-100/60 bg-emerald-50/15 hover:bg-stone-100 dark:border-emerald-900/30 dark:bg-emerald-950/10'
                      : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60'
                  } ${!dayObj.isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  {/* Top: Gregorian Day Number + Indicators */}
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        dayObj.isToday
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-bold'
                          : isSelected
                          ? 'text-emerald-900 dark:text-emerald-300 font-bold'
                          : isForbidden
                          ? 'text-rose-700 dark:text-rose-400 font-bold'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {/* Hijri Day Number */}
                    <span className="text-[9px] font-sans font-bold text-emerald-800 dark:text-emerald-400/90 opacity-80">
                      {dayObj.hijri.day}
                    </span>
                  </div>

                  {/* Badges / Checkmark */}
                  <div className="w-full flex items-center justify-center my-0.5">
                    {dayObj.hasRecords ? (
                      <div className="flex items-center gap-0.5 rounded bg-emerald-100/90 px-1 py-0.2 text-[9px] font-bold text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                        <span>✓ +{dayObj.totalDaysFasted}</span>
                      </div>
                    ) : isForbidden ? (
                      <span className="text-[8px] font-sans font-bold text-rose-600 dark:text-rose-400">
                        Haram
                      </span>
                    ) : isSunnah ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                    ) : (
                      <div className="h-2" />
                    )}
                  </div>

                  {/* Special event snippet */}
                  <div className="w-full text-center truncate">
                    {dayObj.hijri.specialEvent ? (
                      <span className="text-[8px] font-sans text-amber-700 dark:text-amber-300 font-medium truncate block">
                        {dayObj.hijri.specialEvent}
                      </span>
                    ) : (
                      <span className="text-[8px] font-sans text-stone-400 dark:text-stone-500 opacity-60">
                        {dayObj.hijri.monthName.slice(0, 3)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-stone-500 dark:text-stone-400 pt-3.5 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-1.5">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white text-[8px]">
                ✓
              </span>
              <span>{language === 'ms' ? 'Puasa Ganti Selesai' : 'Makeup Fast Completed'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-900 dark:bg-white" />
              <span>{t.today}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{language === 'ms' ? 'Hari Sunnah (Isn/Kha/Putih)' : 'Sunnah Fasting Day'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{language === 'ms' ? 'Diharamkan Puasa (Raya/Tasyrik)' : 'Prohibited Day (Eid/Tashreeq)'}</span>
            </div>
          </div>

        </div>

        {/* Selected Date Detail Drawer/Card & Islamic Reference */}
        <div className="space-y-4">
          
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between">
            <div>
              {/* Gregorian Date Header */}
              <div className="border-b border-stone-100 pb-3 dark:border-stone-800">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  {getDayOfWeekName(selectedDate, language)}
                </span>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {formatDateMalay(selectedDate, language)}
                </h3>
                
                {/* Official Hijri Takwim Tag */}
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Moon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{selectedDateHijri.formatted}</span>
                </div>
              </div>

              {/* Status Warning or Sunnah Notice */}
              {selectedDateHijri.isForbidden ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <span>{selectedDateHijri.forbiddenReason}</span>
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-1">
                    {language === 'ms' 
                      ? 'Puasa ganti tidak sah dan diharamkan pada hari ini mengikut syariat Islam.' 
                      : 'Fasting on this date is strictly invalid and prohibited in Islam.'}
                  </p>
                </div>
              ) : selectedDateHijri.isSunnah ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{selectedDateHijri.sunnahReason}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                    {language === 'ms'
                      ? 'Sangat digalakkan menggabungkan niat puasa ganti dengan puasa sunat hari ini.'
                      : 'Recommended to combine intention for makeup fast and sunnah fast today.'}
                  </p>
                </div>
              ) : null}

              {/* Records for selected date */}
              <div className="my-4 space-y-2.5">
                {selectedDateRecords.length === 0 ? (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-800">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {t.noRecordsOnDate}
                    </p>
                  </div>
                ) : (
                  selectedDateRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-xl border border-stone-200/70 bg-stone-50/70 p-3 dark:border-stone-700/60 dark:bg-stone-800/50 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[11px] font-mono font-bold text-white">
                          +{record.days} {t.dayUnitSingular}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditRecord(record)}
                            className="rounded-md p-1 text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700 cursor-pointer"
                            title={t.btnEdit}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(record.id)}
                            className="rounded-md p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
                            title={t.btnDelete}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                        {record.notes || (language === 'ms' ? 'Puasa ganti selesai' : 'Makeup fast completed')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add Button for Selected Date */}
            <button
              id="calendar-add-for-date-btn"
              onClick={() => onSelectDateToRecord(selectedDate)}
              disabled={selectedDateHijri.isForbidden}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xs transition active:scale-[0.99] cursor-pointer ${
                selectedDateHijri.isForbidden
                  ? 'bg-stone-300 text-stone-500 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{t.btnAddForThisDate}</span>
            </button>
          </div>

          {/* Official JAKIM e-Solat Takwim Link Reference Card */}
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                {t.islamicCalendarRefTitle}
              </h4>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
              {t.islamicCalendarRefDesc}
            </p>
            <a
              href="https://www.e-solat.gov.my/index.php?siteId=24&pageId=26"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1 cursor-pointer"
            >
              <span>{t.btnOpenESolat}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

        </div>

      </div>

    </div>
  );
};
