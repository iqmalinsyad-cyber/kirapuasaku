import React, { useState } from 'react';
import { Calendar, FileText, ArrowRight } from 'lucide-react';
import { Language, QadaRecord } from '../types';
import { getTranslation } from '../translations';

interface OnboardingProps {
  language: Language;
  onComplete: (newQada: QadaRecord) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ language, onComplete }) => {
  const t = getTranslation(language);
  const [days, setDays] = useState<number | ''>(15);
  const [year, setYear] = useState<string>('Ramadan 1447H / 2026');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const quickPresets = [5, 7, 10, 14, 15, 20, 30];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!days || days <= 0) {
      setError(language === 'ms' ? 'Sila masukkan bilangan hari yang sah (sekurang-kurangnya 1 hari).' : 'Please enter a valid number of days (at least 1).');
      return;
    }

    const newRecord: QadaRecord = {
      id: 'qada_' + Date.now(),
      user_id: 'user_' + Date.now(),
      total_required: Number(days),
      total_completed: 0,
      remaining: Number(days),
      year: year.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onComplete(newRecord);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-2xs dark:border-stone-800 dark:bg-stone-900 transition-colors">
        
        {/* Header Icon & Title */}
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
                id="onboarding-days-input"
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
              id="onboarding-year-input"
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
              id="onboarding-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.placeholderNotes}
              className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-800/50 dark:text-white transition-all shadow-2xs"
            />
          </div>

          {/* Submit Button */}
          <button
            id="onboarding-submit-btn"
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99] cursor-pointer mt-5"
          >
            <span>{t.btnStartRecord}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
