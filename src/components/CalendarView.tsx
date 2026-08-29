import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { DailyRecord, Language } from '../types';
import { getTranslation } from '../translations';
import { formatDateMalay, getTodayDateString, getDayOfWeekName } from '../utils/date';

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

  // Generate days in month
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
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDaysCount - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const recs = recordsByDate.get(dateStr) || [];
      const totalDaysFasted = recs.reduce((sum, r) => sum + r.days, 0);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const recs = recordsByDate.get(dateStr) || [];
      const totalDaysFasted = recs.reduce((sum, r) => sum + r.days, 0);

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
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

      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        hasRecords: recs.length > 0,
        totalDaysFasted,
      });
    }

    return days;
  }, [year, month, recordsByDate, todayStr]);

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

  // Selected date records
  const selectedDateRecords = recordsByDate.get(selectedDate) || [];

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

        <button
          id="calendar-today-btn"
          onClick={goToToday}
          className="inline-flex items-center self-start sm:self-auto gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-750 transition cursor-pointer shadow-2xs"
        >
          <span>{t.today}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Calendar Card */}
        <div className="lg:col-span-2 rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
              {t.months[month]} {year}
            </h2>

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
              
              return (
                <button
                  key={dayObj.dateStr}
                  id={`cal-day-${dayObj.dateStr}`}
                  onClick={() => setSelectedDate(dayObj.dateStr)}
                  className={`group relative flex flex-col items-center justify-between rounded-xl p-1.5 min-h-[52px] sm:min-h-[64px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/90 dark:border-emerald-500 dark:bg-emerald-950/60 shadow-2xs scale-[1.02] z-10'
                      : dayObj.hasRecords
                      ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      : 'border-transparent hover:bg-stone-100 dark:hover:bg-stone-800/60'
                  } ${!dayObj.isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  {/* Day Number & Today indicator */}
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        dayObj.isToday
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-bold'
                          : isSelected
                          ? 'text-emerald-900 dark:text-emerald-300 font-bold'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {dayObj.dayNumber}
                    </span>

                    {/* Checkmark badge */}
                    {dayObj.hasRecords && (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Day summary label */}
                  {dayObj.hasRecords ? (
                    <div className="mt-1 flex items-center gap-0.5 rounded bg-emerald-100/90 px-1 py-0.2 text-[9px] font-bold text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                      <span>+{dayObj.totalDaysFasted}</span>
                      <span className="hidden sm:inline">{t.dayUnitSingular}</span>
                    </div>
                  ) : (
                    <div className="h-3" />
                  )}
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
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">ISN & KHA</span>
              <span>{language === 'ms' ? 'Hari Sunnah' : 'Sunnah Fasting Days'}</span>
            </div>
          </div>

        </div>

        {/* Selected Date Detail Drawer/Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between">
          <div>
            <div className="border-b border-stone-100 pb-3 dark:border-stone-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {getDayOfWeekName(selectedDate, language)}
              </span>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                {formatDateMalay(selectedDate, language)}
              </h3>
            </div>

            {/* Records for selected date */}
            <div className="my-4 space-y-2.5">
              {selectedDateRecords.length === 0 ? (
                <div className="py-8 text-center">
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{t.btnAddForThisDate}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
