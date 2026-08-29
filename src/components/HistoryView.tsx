import React, { useState, useMemo } from 'react';
import { History as HistoryIcon, Search, Filter, Edit2, Trash2, Calendar, AlertCircle, Plus } from 'lucide-react';
import { DailyRecord, Language } from '../types';
import { getTranslation } from '../translations';
import { formatDateMalay } from '../utils/date';

interface HistoryViewProps {
  records: DailyRecord[];
  language: Language;
  onEdit: (record: DailyRecord) => void;
  onDelete: (recordId: string) => void;
  onOpenAddModal: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  language,
  onEdit,
  onDelete,
  onOpenAddModal,
}) => {
  const t = getTranslation(language);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Extract available months from records
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    records.forEach((r) => {
      if (r.date) {
        const [year, month] = r.date.split('-');
        monthSet.add(`${year}-${month}`);
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [records]);

  // Filtered and searched records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const formattedDate = formatDateMalay(record.date, language).toLowerCase();
      const rawDate = record.date.toLowerCase();
      const notes = (record.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = !q || formattedDate.includes(q) || rawDate.includes(q) || notes.includes(q);
      const matchesMonth = selectedMonth === 'all' || record.date.startsWith(selectedMonth);

      return matchesSearch && matchesMonth;
    });
  }, [records, searchQuery, selectedMonth, language]);

  const targetRecordToDelete = records.find((r) => r.id === deleteConfirmId);

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2.5 font-sans">
            <HistoryIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.historyTitle}</span>
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {t.historySubtitle}
          </p>
        </div>

        <button
          id="history-add-record-btn"
          onClick={onOpenAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>{t.btnRecordQada}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            id="history-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-white shadow-2xs"
          />
        </div>

        {availableMonths.length > 0 && (
          <div className="relative sm:w-56">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <select
              id="history-month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-stone-900 focus:border-emerald-600 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-white appearance-none shadow-2xs"
            >
              <option value="all">{t.allMonths}</option>
              {availableMonths.map((ym) => {
                const [year, month] = ym.split('-');
                const monthIndex = parseInt(month, 10) - 1;
                const monthName = t.months[monthIndex] || month;
                return (
                  <option key={ym} value={ym}>
                    {monthName} {year}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Records Count Badge */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>
          {language === 'ms' 
            ? `Menunjukkan ${filteredRecords.length} rekod` 
            : `Showing ${filteredRecords.length} entries`}
        </span>
        {selectedMonth !== 'all' && (
          <button
            onClick={() => setSelectedMonth('all')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {language === 'ms' ? 'Kosongkan tapisan' : 'Clear filter'}
          </button>
        )}
      </div>

      {/* List of Records */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-12 text-center shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-800">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            {t.emptyHistory}
          </h3>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {t.emptyHistoryDesc}
          </p>
          <button
            id="empty-history-add-btn"
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.btnRecordQada}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-2xs hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700 transition"
            >
              <div className="flex items-start sm:items-center gap-3">
                {/* Days Badge */}
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-mono font-bold">
                  <span className="text-sm leading-none">+{record.days}</span>
                  <span className="text-[8px] font-semibold uppercase">{t.dayUnitSingular}</span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                    {formatDateMalay(record.date, language)}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {record.notes || (language === 'ms' ? 'Puasa ganti selesai' : 'Makeup fast')}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                    {language === 'ms' ? 'Direkod pada: ' : 'Logged on: '}
                    {new Date(record.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Edit & Delete */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  id={`edit-record-${record.id}`}
                  onClick={() => onEdit(record)}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-emerald-700 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-emerald-400 transition cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>{t.btnEdit}</span>
                </button>

                <button
                  id={`delete-record-${record.id}`}
                  onClick={() => setDeleteConfirmId(record.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{t.btnDelete}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && targetRecordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {t.confirmDeleteTitle}
                </h3>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  {t.confirmDeleteDesc
                    .replace('{date}', formatDateMalay(targetRecordToDelete.date, language))
                    .replace('{days}', String(targetRecordToDelete.days))}
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                id="cancel-delete-modal-btn"
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancel}
              </button>

              <button
                id="confirm-delete-modal-btn"
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition cursor-pointer"
              >
                {t.btnDelete}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
