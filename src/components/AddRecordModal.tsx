import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DailyRecord, Language } from '../types';
import { getTranslation } from '../translations';
import { getTodayDateString } from '../utils/date';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<DailyRecord, 'id' | 'qada_record_id' | 'created_at' | 'updated_at'>) => void;
  editingRecord?: DailyRecord | null;
  remainingDays: number;
  qadaRecordId: string;
  language: Language;
  initialDate?: string;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  remainingDays,
  language,
  initialDate,
}) => {
  const t = getTranslation(language);

  const [date, setDate] = useState<string>(getTodayDateString());
  const [daysMode, setDaysMode] = useState<'1' | '2' | '3' | 'custom'>('1');
  const [customDays, setCustomDays] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showOverLimitConfirm, setShowOverLimitConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setDate(editingRecord.date);
        if ([1, 2, 3].includes(editingRecord.days)) {
          setDaysMode(String(editingRecord.days) as '1' | '2' | '3');
          setCustomDays('');
        } else {
          setDaysMode('custom');
          setCustomDays(editingRecord.days);
        }
        setNotes(editingRecord.notes || '');
      } else {
        setDate(initialDate || getTodayDateString());
        setDaysMode('1');
        setCustomDays('');
        setNotes('');
      }
      setError('');
      setShowOverLimitConfirm(false);
    }
  }, [isOpen, editingRecord, initialDate]);

  if (!isOpen) return null;

  const currentDaysValue = daysMode === 'custom' ? Number(customDays) : Number(daysMode);
  const effectiveRemaining = editingRecord ? remainingDays + editingRecord.days : remainingDays;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError(t.dateInvalidError);
      return;
    }

    if (!currentDaysValue || currentDaysValue <= 0) {
      setError(t.daysInvalidError);
      return;
    }

    if (currentDaysValue > effectiveRemaining && !showOverLimitConfirm) {
      setShowOverLimitConfirm(true);
      return;
    }

    onSave({
      date,
      days: currentDaysValue,
      notes: notes.trim() || undefined,
    });
  };

  const confirmAndProceed = () => {
    onSave({
      date,
      days: currentDaysValue,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 transition-all">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              {editingRecord ? t.modalEditTitle : t.modalAddTitle}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t.heroTagline}
            </p>
          </div>
          
          <button
            id="close-add-record-modal"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Confirmation Banner if Exceeding Balance */}
        {showOverLimitConfirm ? (
          <div className="my-5 space-y-3 rounded-xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-stone-900 dark:text-amber-100">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {t.confirmOverLimitTitle}
                </h3>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {t.overLimitWarning
                    .replace('{remaining}', String(effectiveRemaining))
                    .replace('{days}', String(currentDaysValue))}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                id="cancel-overlimit-btn"
                type="button"
                onClick={() => setShowOverLimitConfirm(false)}
                className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-stone-700 border border-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                id="confirm-overlimit-btn"
                type="button"
                onClick={confirmAndProceed}
                className="flex-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition cursor-pointer"
              >
                {t.confirmOverLimitBtn}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-3.5">
            
            {/* Date Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelDate} <span className="text-rose-500">*</span>
              </label>
              <input
                id="record-date-picker"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition"
              />
            </div>

            {/* Days Selection Buttons */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                {t.labelDaysCount} <span className="text-rose-500">*</span>
              </label>
              
              <div className="grid grid-cols-4 gap-2 font-mono">
                {(['1', '2', '3'] as const).map((count) => {
                  const isSelected = daysMode === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      id={`quick-days-${count}-btn`}
                      onClick={() => {
                        setDaysMode(count);
                        setCustomDays('');
                        setError('');
                      }}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 border transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold dark:border-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-200 shadow-2xs'
                          : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-300'
                      }`}
                    >
                      <span className="text-sm font-bold">{count}</span>
                      <span className="text-[10px] font-sans font-medium opacity-80">{t.dayUnitSingular}</span>
                    </button>
                  );
                })}

                {/* Custom Button */}
                <button
                  type="button"
                  id="quick-days-custom-btn"
                  onClick={() => {
                    setDaysMode('custom');
                    if (!customDays) setCustomDays(4);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 border transition cursor-pointer font-sans ${
                    daysMode === 'custom'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold dark:border-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-200 shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-300'
                  }`}
                >
                  <span className="text-xs font-bold">{t.quickDaysCustom}</span>
                  <span className="text-[10px] font-medium opacity-80">...</span>
                </button>
              </div>

              {/* Custom Number Input if custom selected */}
              {daysMode === 'custom' && (
                <div className="mt-2">
                  <input
                    id="custom-days-input"
                    type="number"
                    min="1"
                    max="100"
                    value={customDays}
                    onChange={(e) => {
                      setCustomDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1));
                      setError('');
                    }}
                    placeholder={t.customDaysPlaceholder}
                    autoFocus
                    className="block w-full rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none dark:border-emerald-500 dark:bg-stone-800 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                {t.labelRecordNotes}
              </label>
              <input
                id="record-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.placeholderRecordNotes}
                className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs font-semibold text-rose-500">{error}</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                id="cancel-record-btn"
                type="button"
                onClick={onClose}
                className="w-1/3 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {t.btnCancel}
              </button>

              <button
                id="save-record-btn"
                type="submit"
                className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-2xs transition active:scale-[0.99] cursor-pointer"
              >
                {editingRecord ? t.btnUpdateRecord : t.btnSaveRecord}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
