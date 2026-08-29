import React, { useState } from 'react';
import { X, ExternalLink, BookOpen, CheckCircle, Search, ShieldCheck, Bookmark, Sparkles } from 'lucide-react';
import { ISLAMIC_GUIDANCE_LIST, GuidanceItem } from '../data/guidance';
import { Language } from '../types';

interface GuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const GuidanceModal: React.FC<GuidanceModalProps> = ({ isOpen, onClose, language }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredItems = ISLAMIC_GUIDANCE_LIST.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 p-4 sm:p-5 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-sans">
                {language === 'ms' ? 'Peringatan & Panduan Fiqh Puasa Qada' : 'Fasting Guidance & Authentic Hadiths'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {language === 'ms' 
                  ? 'Disandarkan kepada sumber rasmi PMWP, YADIM (Sahih al-Bukhari) & SemakHadis'
                  : 'Sourced from PMWP, YADIM Sahih Bukhari & SemakHadis'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Source References Banner */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Sumber Web Rasmi & Diiktiraf:</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex-wrap">
            <a 
              href="https://www.muftiwp.gov.my/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline inline-flex items-center gap-0.5"
            >
              1. Mufti WP <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </a>
            <span>•</span>
            <a 
              href="https://www.yadim.com.my/v2/shahih-bukhari-mengenai-puasa-ramadhan/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline inline-flex items-center gap-0.5"
            >
              2. YADIM (Sahih Bukhari) <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </a>
            <span>•</span>
            <a 
              href="https://semakhadis.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline inline-flex items-center gap-0.5"
            >
              3. SemakHadis.com <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </a>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 space-y-3 bg-white dark:bg-stone-900">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ms' ? 'Cari hadis, fatwa atau panduan niat...' : 'Search guidelines, fatwas or hadiths...'}
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-9 pr-3.5 py-2 text-xs text-stone-800 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: language === 'ms' ? 'Semua Panduan' : 'All' },
              { id: 'hadith', label: 'Hadis Sahih (YADIM / Bukhari)' },
              { id: 'fatwa', label: 'Fatwa PMWP' },
              { id: 'niat', label: 'Niat & Syarat Qada' },
              { id: 'fidyah', label: 'Hukum Fidyah' },
              { id: 'semak_hadis', label: 'Semak Hadis' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer text-xs ${
                  selectedCategory === tab.id
                    ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guidance Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[55vh]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              Tiada panduan dijumpai untuk carian anda.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id}
                className="rounded-xl border border-stone-200/90 bg-stone-50/40 p-4 dark:border-stone-800 dark:bg-stone-800/40 hover:border-emerald-600/40 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <Sparkles className="h-2.5 w-2.5" />
                      {item.sourceTag}
                    </span>
                    {item.authenticityStatus && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                        ✓ {item.authenticityStatus}
                      </span>
                    )}
                  </div>
                  
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold shrink-0"
                  >
                    <span>Buka Sumber</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {item.title}
                </h3>

                {item.arabic && (
                  <div className="rounded-lg bg-emerald-50/80 p-2.5 text-center dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 my-2">
                    <p className="font-amiri text-base font-bold text-emerald-900 dark:text-emerald-300 leading-relaxed">
                      {item.arabic}
                    </p>
                  </div>
                )}

                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-serif italic bg-white/70 dark:bg-stone-900/60 p-2.5 rounded-lg border border-stone-200/60 dark:border-stone-800/60">
                  {item.content}
                </p>

                <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                  <strong>Huraian & Kesimpulan:</strong> {item.detail}
                </p>

                <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
                  <span>Rujukan: {item.sourceName}</span>
                  <a 
                    href={item.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    {item.sourceUrl.replace('https://www.', '').replace('https://', '').split('/')[0]}
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-stone-200 p-4 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-between">
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            KiraPuasaKu • Memastikan amalan bertepatan syarak
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
