import React, { useState } from 'react';
import { Calendar, FileText, ArrowRight, X } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface SetNewTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentCompleted: number;
  currentTarget: number;
  onSaveNewTarget: (newTotalRequired: number, year?: string, notes?: string) => Promise<void> | void;
}

export const SetNewTargetModal: React.FC<SetNewTargetModalProps> = ({
  isOpen,
  onClose,
  language,
  currentCompleted,
  currentTarget,
  onSaveNewTarget,
}) => {
  const t = getTranslation(language);
  const [days, setDays] = useState<number | ''>(15);
  const [year, setYear] = useState<string>('Ramadan 1447H / 2026');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const quickPresets = [5, 7, 10, 14, 15, 20, 30];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!days || days <= 0) {
      setError(language === 'ms' ? 'Sila masukkan bilangan hari yang sah (sekurang-kurangnya 1 hari).' : 'Please enter a valid number of days (at least 1).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveNewTarget(Number(days), year.trim() || undefined, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat semasa menyimpan sasaran baharu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-2xl dark:border-stone-800 dark:bg-stone-900 transition-colors relative">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
          aria-label={t.closeBtn}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon & Title matching Onboarding page */}
        <div className="text-center mb-6">
          <img
            src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
            alt="KiraPuasaKu"
            className="mx-auto mb-3 h-14 w-14 object-contain"
            referrerPolicy="no-referrer"
          />
          
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white font-sans">
            {t.onboardingTitle}
          </h1>
          
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-md mx-auto">
            {t.onboardingDesc}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Days Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              {t.labelTotalDays} <span className="text-rose-500">*</span>
            </label>
            
            <div className="relative">
              <input
                id="new-target-days-input"
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => {
                  setDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1));
                  setError('');
                }}
                placeholder={t.placeholderTotalDays}
                required
                className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-2xl font-mono font-bold text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition-all text-center sm:text-left shadow-2xs"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 uppercase font-sans">
                {t.daysUnit}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5">
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-1.5">
                {language === 'ms' ? 'Pilihan pantas:' : 'Quick presets:'}
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono">
                {quickPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDays(preset);
                      setError('');
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      days === preset
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-750'
                    }`}
                  >
                    {preset} {t.dayUnitSingular}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>
            )}
          </div>

          {/* Year / Period (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                {t.labelYear}
              </span>
            </label>
            <input
              id="new-target-year-input"
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t.placeholderYear}
              className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition-all shadow-2xs"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-stone-400" />
                {t.labelNotes}
              </span>
            </label>
            <input
              id="new-target-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.placeholderNotes}
              className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition-all shadow-2xs"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 transition cursor-pointer"
            >
              {t.btnCancel}
            </button>
            <button
              id="new-target-submit-btn"
              type="submit"
              disabled={isSubmitting || !days}
              className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? (language === 'ms' ? 'Menyimpan...' : 'Saving...') : (language === 'ms' ? 'Simpan & Mula Rekod' : 'Save & Start Tracking')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
