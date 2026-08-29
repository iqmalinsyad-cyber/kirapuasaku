import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, Share, PlusSquare, 
  MoreVertical, Check, ExternalLink, Sparkles, X 
} from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onNativeInstall?: () => void;
  canNativeInstall?: boolean;
  isStandalone?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  language,
  onNativeInstall,
  canNativeInstall = false,
  isStandalone = false,
}) => {
  const t = getTranslation(language);
  
  // Auto-detect iOS vs Android
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      setActiveTab(isIOS ? 'ios' : 'android');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <span>{t.pwaGuideTitle}</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t.pwaGuideSubtitle}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Native Install Button if browser supports direct prompt */}
        {canNativeInstall && !isStandalone && onNativeInstall && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 flex items-center justify-between gap-3">
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <p className="font-bold">Pasang Satu Klik Sedia!</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Pelayar anda menyokong pemasangan terus.</p>
            </div>
            <button
              type="button"
              onClick={onNativeInstall}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-[0.98] transition cursor-pointer shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.btnInstallAppShort}</span>
            </button>
          </div>
        )}

        {/* Standalone state notification */}
        {isStandalone && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 flex items-center gap-3">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <p className="font-bold">{t.pwaInstalledBadge}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{t.pwaInstalledDesc}</p>
            </div>
          </div>
        )}

        {/* Device selector tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-900 dark:text-white'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>{t.pwaTabIos}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'android'
                ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-900 dark:text-white'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            <span>{t.pwaTabAndroid}</span>
          </button>
        </div>

        {/* Tab Content: iOS */}
        {activeTab === 'ios' && (
          <div className="mt-4 space-y-3.5 text-xs text-stone-700 dark:text-stone-300">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <div className="pt-0.5">
                <p className="font-bold text-stone-900 dark:text-white">{t.pwaIosStep1Title}</p>
                <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{t.pwaIosStep1Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                2
              </div>
              <div className="pt-0.5">
                <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>{t.pwaIosStep2Title}</span>
                  <Share className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </p>
                <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{t.pwaIosStep2Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                3
              </div>
              <div className="pt-0.5">
                <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>{t.pwaIosStep3Title}</span>
                  <PlusSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </p>
                <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{t.pwaIosStep3Desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Android */}
        {activeTab === 'android' && (
          <div className="mt-4 space-y-3.5 text-xs text-stone-700 dark:text-stone-300">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <div className="pt-0.5">
                <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>{t.pwaAndroidStep1Title}</span>
                  <MoreVertical className="h-3.5 w-3.5 text-stone-600 dark:text-stone-400" />
                </p>
                <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{t.pwaAndroidStep1Desc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                2
              </div>
              <div className="pt-0.5">
                <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>{t.pwaAndroidStep2Title}</span>
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </p>
                <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">{t.pwaAndroidStep2Desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 text-xs font-bold transition active:scale-[0.98] cursor-pointer"
          >
            {t.pwaBtnClose}
          </button>
        </div>

      </div>
    </div>
  );
};
