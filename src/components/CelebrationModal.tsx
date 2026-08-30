import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, ArrowRight, Target } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  totalDaysCompleted: number;
  onOpenSetNewTarget?: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  language,
  totalDaysCompleted,
  onOpenSetNewTarget,
}) => {
  const t = getTranslation(language);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#f59e0b', '#fbbf24', '#ffffff'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#059669', '#10b981', '#f59e0b'],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#059669', '#10b981', '#f59e0b'],
          });
        }, 300);
      } catch (e) {
        console.error('Confetti error', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 p-6 sm:p-8 text-center text-white shadow-2xl">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon / Trophy */}
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/30">
          <span className="text-2xl">✨</span>
        </div>

        {/* Title */}
        <div className="inline-block rounded-md bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-300/30 mb-2">
          100% {language === 'ms' ? 'Selesai' : 'Completed'}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
          {t.congratsTitle}
        </h2>

        <p className="mt-2 text-xs text-stone-300 leading-relaxed max-w-sm mx-auto">
          {language === 'ms'
            ? `Tahniah! Anda telah menyempurnakan kesemua ${totalDaysCompleted} hari puasa ganti yang direkodkan. Baki puasa anda kini adalah 0 hari.`
            : `Congratulations! You have completed all ${totalDaysCompleted} required makeup fasts. Your remaining balance is now 0 days.`}
        </p>

        {/* Stats badge */}
        <div className="my-5 grid grid-cols-2 gap-2.5 rounded-xl bg-stone-850 p-3.5 border border-stone-800 font-mono">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-sans font-semibold">{t.completedLabel}</span>
            <p className="text-xl font-bold text-amber-400">{totalDaysCompleted} {t.dayUnitSingular}</p>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-sans font-semibold">{t.remainingLabel}</span>
            <p className="text-xl font-bold text-emerald-400">0 {t.dayUnitSingular}</p>
          </div>
        </div>

        <div className="space-y-2">
          {onOpenSetNewTarget && (
            <button
              id="celebration-modal-new-target-btn"
              onClick={() => {
                onClose();
                onOpenSetNewTarget();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-stone-950 shadow-md transition cursor-pointer"
            >
              <Target className="h-4 w-4" />
              <span>{t.btnSetNewTarget}</span>
            </button>
          )}

          <button
            id="celebration-modal-continue-btn"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
          >
            <span>{language === 'ms' ? 'Alhamdulillah, Teruskan' : 'Continue'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
