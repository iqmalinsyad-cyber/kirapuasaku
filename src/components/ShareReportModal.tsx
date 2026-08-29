import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Image as ImageIcon,
  Palette,
  Send
} from 'lucide-react';
import { QadaRecord, DailyRecord, Language, User } from '../types';
import { getTranslation } from '../translations';
import { formatDateMalay, getTodayDateString } from '../utils/date';

export type CardTheme = 'emerald' | 'ivory' | 'midnight';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  qada: QadaRecord | null;
  records: DailyRecord[];
  totalRequired: number;
  totalCompleted: number;
  remaining: number;
  progressPercent: number;
  language: Language;
  currentUser?: User | null;
  userName?: string;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  qada,
  records,
  totalRequired,
  totalCompleted,
  remaining,
  progressPercent,
  language,
  currentUser,
  userName,
  onShowToast,
}) => {
  const t = getTranslation(language);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('emerald');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const displayName = currentUser?.name || userName || 'Pengguna KiraPuasaKu';
  const displayRole = currentUser?.role === 'admin' ? 'Admin' : '';
  const todayStr = getTodayDateString();
  const formattedDate = formatDateMalay(todayStr);

  const remainingPercent = totalRequired > 0 
    ? Math.max(0, Math.round((remaining / totalRequired) * 100)) 
    : 0;

  const isFullyCompleted = remaining === 0 && totalRequired > 0;

  // Build formatted text for sharing on WhatsApp / Telegram
  const generateShareText = () => {
    return [
      `🌙 *KiraPuasaKu - Laporan Status Puasa Ganti* 🌙`,
      `👤 Nama: *${displayName}*`,
      `📅 Tarikh: ${formattedDate}`,
      ``,
      `📊 *Ringkasan Status:*`,
      `• Baki Puasa Perlu Diganti: *${remaining} Hari* (${remainingPercent}%)`,
      `• Telah Selesai: *${totalCompleted} Hari* (${progressPercent}%)`,
      `• Sasaran Keseluruhan: *${totalRequired} Hari*`,
      ``,
      isFullyCompleted 
        ? `🎉 *Alhamdulillah! Semua puasa ganti telah berjaya diselesaikan!*` 
        : `✨ *Dalam Usaha:* Tinggal *${remaining} hari* lagi untuk diselesaikan.`,
      ``,
      `🤲 _"Semoga Allah SWT menerima amalan puasa kita dan mempermudah segala urusan ibadah."_`,
      ``,
      `📲 Dihasilkan melalui *KiraPuasaKu* (Catat . Kira . Selesai)`
    ].join('\n');
  };

  // Render high-res image to HTML5 Canvas
  const drawCardToCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGenerating(true);

    // Canvas Dimensions: 1080 x 1350 (4:5 vertical card, perfect for social sharing & mobile)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // Helper: Rounded Rectangle
    const roundRect = (
      x: number, 
      y: number, 
      w: number, 
      h: number, 
      radius: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // Color Palettes by Theme
    let bgGradStart = '#064e3b';
    let bgGradEnd = '#022c22';
    let cardBg = 'rgba(255, 255, 255, 0.08)';
    let cardBorder = 'rgba(251, 191, 36, 0.35)'; // Amber/Gold
    let titleColor = '#ffffff';
    let subColor = '#a7f3d0';
    let statNumberColor = '#fbbf24'; // Gold
    let statBoxBg = 'rgba(0, 0, 0, 0.25)';
    let statBoxBorder = 'rgba(255, 255, 255, 0.12)';
    let statLabelColor = '#cbd5e1';
    let statValueColor = '#ffffff';
    let progressBg = 'rgba(255, 255, 255, 0.15)';
    let progressFillStart = '#10b981';
    let progressFillEnd = '#fbbf24';
    let quoteColor = '#d1fae5';

    if (selectedTheme === 'ivory') {
      bgGradStart = '#fcfdfa';
      bgGradEnd = '#f3efe6';
      cardBg = '#ffffff';
      cardBorder = 'rgba(5, 150, 105, 0.32)';
      titleColor = '#0f172a';
      subColor = '#047857';
      statNumberColor = '#b45309';
      statBoxBg = '#ffffff';
      statBoxBorder = '#cbd5e1';
      statLabelColor = '#475569';
      statValueColor = '#0f172a';
      progressBg = '#e2e8f0';
      progressFillStart = '#059669';
      progressFillEnd = '#10b981';
      quoteColor = '#1e293b';
    } else if (selectedTheme === 'midnight') {
      bgGradStart = '#0b1329';
      bgGradEnd = '#020617';
      cardBg = 'rgba(255, 255, 255, 0.06)';
      cardBorder = 'rgba(245, 158, 11, 0.4)';
      titleColor = '#ffffff';
      subColor = '#94a3b8';
      statNumberColor = '#f59e0b';
      statBoxBg = 'rgba(15, 23, 42, 0.6)';
      statBoxBorder = 'rgba(255, 255, 255, 0.12)';
      statLabelColor = '#94a3b8';
      statValueColor = '#ffffff';
      progressBg = 'rgba(255, 255, 255, 0.12)';
      progressFillStart = '#f59e0b';
      progressFillEnd = '#fbbf24';
      quoteColor = '#e2e8f0';
    }

    // 1. Fill Card Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, bgGradStart);
    bgGradient.addColorStop(1, bgGradEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Decorative Geometric Background Grid / Watermark Pattern
    ctx.save();
    ctx.strokeStyle = selectedTheme === 'ivory' ? 'rgba(6, 78, 59, 0.04)' : 'rgba(251, 191, 36, 0.05)';
    ctx.lineWidth = 2;
    for (let r = 80; r < width; r += 160) {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Subtle outer frame border
    ctx.strokeStyle = selectedTheme === 'ivory' ? 'rgba(6, 78, 59, 0.15)' : 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 3;
    roundRect(30, 30, width - 60, height - 60, 24);
    ctx.stroke();
    ctx.restore();

    // 3. Header: Arabic Bismillah Calligraphy
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 28px "Amiri", serif';
    ctx.fillStyle = selectedTheme === 'ivory' ? '#047857' : '#a7f3d0';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 95);

    // 4. Logo & App Branding Header
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    // Load Logo with fallback
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        try {
          ctx.drawImage(logoImg, width / 2 - 45, 140, 90, 90);
        } catch {
          // fallback if tainted
        }
        resolve();
      };
      logoImg.onerror = () => {
        resolve();
      };
      logoImg.src = 'https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn';
    });

    // App Name & Tagline
    ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = titleColor;
    ctx.fillText('KiraPuasaKu', width / 2, 265);

    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText('CATAT . KIRA . SELESAI • LAPORAN STATUS PUASA GANTI', width / 2, 305);

    // 5. User Badge & Timestamp Bar
    const badgeY = 350;
    ctx.save();
    ctx.fillStyle = statBoxBg;
    ctx.strokeStyle = statBoxBorder;
    ctx.lineWidth = 1.5;
    roundRect(width / 2 - 280, badgeY, 560, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = titleColor;
    const userRoleStr = displayRole ? ` [${displayRole}]` : '';
    ctx.fillText(`👤 ${displayName}${userRoleStr}  •  📅 ${formattedDate}`, width / 2, badgeY + 24);
    ctx.restore();

    // 6. Main Highlight Card: Baki Puasa Ganti (Hero Stat)
    const heroY = 435;
    ctx.save();
    ctx.fillStyle = cardBg;
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 2.5;
    roundRect(80, heroY, width - 160, 290, 24);
    ctx.fill();
    ctx.stroke();

    // Hero Tag Badge
    ctx.fillStyle = selectedTheme === 'ivory' ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)';
    ctx.strokeStyle = selectedTheme === 'ivory' ? '#86efac' : 'rgba(16, 185, 129, 0.4)';
    roundRect(width / 2 - 120, heroY + 30, 240, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = selectedTheme === 'ivory' ? '#065f46' : '#6ee7b7';
    ctx.fillText('BAKI PUASA GANTI', width / 2, heroY + 48);

    // Big Number: Remaining
    ctx.font = '800 100px "Plus Jakarta Sans", monospace';
    ctx.fillStyle = statNumberColor;
    ctx.fillText(`${remaining}`, width / 2, heroY + 145);

    ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText('HARI BERBAKI UNTUK DIGANTI', width / 2, heroY + 215);

    // Sub progress text inside hero
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = statLabelColor;
    const statusNote = isFullyCompleted 
      ? '✨ 100% Selesai Ditunaikan (Alhamdulillah)' 
      : `Baki Sebanyak ${remainingPercent}% Daripada Jumlah Keseluruhan`;
    ctx.fillText(statusNote, width / 2, heroY + 252);
    ctx.restore();

    // 7. Grid of 3 Detail Metric Boxes
    const gridY = 760;
    const boxW = 280;
    const boxH = 160;
    const gap = 30;
    const startX = 80;

    const statsConfig = [
      {
        label: 'JUMLAH PERLU GANTI',
        value: `${totalRequired} Hari`,
        sub: 'Sasaran Asal',
        icon: '🎯',
      },
      {
        label: 'TELAH SELESAI',
        value: `${totalCompleted} Hari`,
        sub: `${progressPercent}% Selesai`,
        icon: '✅',
      },
      {
        label: 'PERATUS BAKI',
        value: `${remainingPercent}%`,
        sub: `${remaining} Hari Tinggal`,
        icon: '⏳',
      },
    ];

    statsConfig.forEach((item, index) => {
      const boxX = startX + index * (boxW + gap);
      ctx.save();
      ctx.fillStyle = statBoxBg;
      ctx.strokeStyle = statBoxBorder;
      ctx.lineWidth = 2;
      roundRect(boxX, gridY, boxW, boxH, 20);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = statLabelColor;
      ctx.fillText(`${item.icon} ${item.label}`, boxX + boxW / 2, gridY + 36);

      // Value
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = statValueColor;
      ctx.fillText(item.value, boxX + boxW / 2, gridY + 86);

      // Sub text
      ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = subColor;
      ctx.fillText(item.sub, boxX + boxW / 2, gridY + 126);
      ctx.restore();
    });

    // 8. Visual Progress Bar Section
    const progressY = 960;
    ctx.save();
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'left';
    ctx.fillText('KEMAJUAN PENYELESAIAN PUASA GANTI', 80, progressY);

    ctx.textAlign = 'right';
    ctx.fillStyle = statNumberColor;
    ctx.fillText(`${progressPercent}% SELESAI`, width - 80, progressY);

    // Track
    const barW = width - 160;
    const barH = 26;
    ctx.fillStyle = progressBg;
    roundRect(80, progressY + 16, barW, barH, 13);
    ctx.fill();

    // Fill
    const fillW = Math.max(16, (barW * progressPercent) / 100);
    const pGrad = ctx.createLinearGradient(80, 0, 80 + fillW, 0);
    pGrad.addColorStop(0, progressFillStart);
    pGrad.addColorStop(1, progressFillEnd);
    ctx.fillStyle = pGrad;
    roundRect(80, progressY + 16, fillW, barH, 13);
    ctx.fill();
    ctx.restore();

    // 9. Motivational Du'a Box
    const quoteY = 1055;
    ctx.save();
    ctx.fillStyle = selectedTheme === 'ivory' ? '#f0fdf4' : 'rgba(0, 0, 0, 0.2)';
    ctx.strokeStyle = selectedTheme === 'ivory' ? '#a7f3d0' : statBoxBorder;
    ctx.lineWidth = 1.5;
    roundRect(80, quoteY, width - 160, 140, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 24px "Amiri", serif';
    ctx.fillStyle = selectedTheme === 'ivory' ? '#065f46' : '#6ee7b7';
    ctx.fillText('اللَّهُمَّ تَقَبَّلْ مِنَّا صِيَامَنَا وَقِيَامَنَا', width / 2, quoteY + 45);

    ctx.font = 'italic 500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = quoteColor;
    ctx.fillText('"Semoga Allah SWT menerima amalan puasa kita dan mempermudah segala urusan ibadah."', width / 2, quoteY + 95);
    ctx.restore();

    // 10. Footer Branding & URL
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = subColor;
    ctx.fillText('🌙 Dihasilkan Secara Rasmi Melalui KiraPuasaKu • https://kirapuasaku.app', width / 2, 1270);
    ctx.restore();

    // Update preview data URL
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewDataUrl(dataUrl);
    } catch (e) {
      console.warn('Canvas toDataURL warning:', e);
    }

    setIsGenerating(false);
  }, [
    selectedTheme, 
    displayName, 
    displayRole, 
    formattedDate, 
    remaining, 
    totalRequired, 
    totalCompleted, 
    remainingPercent, 
    progressPercent, 
    isFullyCompleted
  ]);

  // Re-draw canvas whenever theme changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        drawCardToCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedTheme, drawCardToCanvas]);

  // Download image file
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `kirapuasaku-laporan-${todayStr}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onShowToast?.(t.imageDownloadedToast, 'success');
    } catch (e) {
      console.error('Download error:', e);
      onShowToast?.('Gagal memuat turun gambar.', 'error');
    }
  };

  // Share via Web Share API or fallback
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownload();
          return;
        }

        const file = new File([blob], `kirapuasaku-laporan-${todayStr}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Laporan Puasa Ganti - KiraPuasaKu',
              text: generateShareText(),
              files: [file],
            });
            onShowToast?.('Laporan berjaya dikongsi!', 'success');
            return;
          } catch (err) {
            // User cancelled share dialog
            if ((err as Error).name !== 'AbortError') {
              console.warn('Web share failed, downloading image instead:', err);
              handleDownload();
            }
          }
        } else {
          // Fallback: Download image and copy text
          handleDownload();
          await navigator.clipboard.writeText(generateShareText());
          onShowToast?.('Gambar dimuat turun & ringkasan teks disalin untuk dikongsi!', 'success');
        }
      }, 'image/png');
    } catch (e) {
      handleDownload();
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = async () => {
    const text = generateShareText();
    // Also copy text and trigger download for convenience
    handleDownload();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onShowToast?.('Gambar dimuat turun & membuka WhatsApp...', 'success');
  };

  // Share via Telegram
  const handleShareTelegram = async () => {
    const text = generateShareText();
    // Also copy text and trigger download for convenience
    handleDownload();
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://kirapuasaku.app')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onShowToast?.('Gambar dimuat turun & membuka Telegram...', 'success');
  };

  // Copy Summary Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setIsCopied(true);
      onShowToast?.(t.textCopiedToast, 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      onShowToast?.('Gagal menyalin teks.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-2xl rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 my-auto text-stone-900 dark:text-stone-100 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-200/80 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-white font-sans">
                {t.shareModalTitle}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t.shareModalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-share-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Theme Selector & Card Preview */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* Theme Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-stone-50 p-3 border border-stone-200/80 dark:bg-stone-850 dark:border-stone-750">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {t.shareCardTheme}:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="theme-emerald-btn"
                onClick={() => setSelectedTheme('emerald')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTheme === 'emerald'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>{t.shareThemeEmerald}</span>
              </button>

              <button
                type="button"
                id="theme-ivory-btn"
                onClick={() => setSelectedTheme('ivory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTheme === 'ivory'
                    ? 'bg-stone-800 text-amber-300 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>{t.shareThemeIvory}</span>
              </button>

              <button
                type="button"
                id="theme-midnight-btn"
                onClick={() => setSelectedTheme('midnight')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedTheme === 'midnight'
                    ? 'bg-slate-950 text-amber-400 border border-amber-500/40 shadow-2xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span>{t.shareThemeMidnight}</span>
              </button>
            </div>
          </div>

          {/* Card Preview Container */}
          <div className="relative flex justify-center items-center rounded-2xl bg-stone-100/90 dark:bg-stone-950/60 p-3 sm:p-4 border border-stone-200/70 dark:border-stone-800 overflow-hidden">
            
            {/* Live React Card Preview (Faithful preview matching Canvas export) */}
            <div 
              className={`w-full max-w-sm rounded-2xl p-5 shadow-lg border transition-all duration-300 relative ${
                selectedTheme === 'emerald'
                  ? 'bg-gradient-to-b from-emerald-900 to-emerald-950 text-white border-amber-400/30'
                  : selectedTheme === 'ivory'
                  ? 'bg-gradient-to-b from-[#fdfbf7] via-stone-50 to-[#f4efe4] text-stone-900 border-emerald-700/30'
                  : 'bg-gradient-to-b from-slate-900 to-slate-950 text-white border-amber-500/40'
              }`}
            >
              {/* Header */}
              <div className="text-center mb-3">
                <p className={`font-amiri text-sm tracking-wide mb-1 ${
                  selectedTheme === 'ivory' ? 'text-emerald-800 font-bold' : 'text-emerald-300 dark:text-emerald-400'
                }`}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <img
                  src="https://lh3.googleusercontent.com/d/1OcU-TrY5DyVXutbYbqzwiZzX7Za2artn"
                  alt="KiraPuasaKu"
                  className="mx-auto h-12 w-12 object-contain mb-1.5"
                  referrerPolicy="no-referrer"
                />
                <h3 className="text-xl font-extrabold font-logo select-none">
                  <span className="brand-title-kira">Kira</span>
                  <span className="brand-title-puasa">Puasa</span>
                  <span className="brand-title-ku">Ku</span>
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedTheme === 'ivory' ? 'text-emerald-800' : 'text-emerald-300 opacity-80'
                }`}>
                  {t.tagline}
                </p>
              </div>

              {/* User badge */}
              <div className="text-center mb-3">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                  selectedTheme === 'ivory'
                    ? 'bg-white border-stone-300 text-stone-800 shadow-2xs'
                    : 'bg-black/20 dark:bg-white/10 border-white/15 text-white'
                }`}>
                  <span>👤 {displayName}</span>
                  {displayRole && (
                    <span className={selectedTheme === 'ivory' ? 'text-emerald-800 font-bold' : 'text-amber-400 font-bold'}>
                      [{displayRole}]
                    </span>
                  )}
                  <span>•</span>
                  <span>📅 {formattedDate}</span>
                </div>
              </div>

              {/* Hero counter */}
              <div className={`rounded-xl p-3.5 text-center mb-3 border ${
                selectedTheme === 'ivory'
                  ? 'bg-white border-emerald-600/40 text-stone-900 shadow-2xs'
                  : 'border-amber-400/30 bg-black/20 text-white'
              }`}>
                <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded border ${
                  selectedTheme === 'ivory'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {t.shareRemainingDays}
                </span>
                <div className={`text-4xl font-extrabold font-mono my-1 ${
                  selectedTheme === 'ivory' ? 'text-amber-700' : 'text-amber-400'
                }`}>
                  {remaining}{' '}
                  <span className={`text-sm font-sans font-bold ${
                    selectedTheme === 'ivory' ? 'text-emerald-900' : 'text-stone-300'
                  }`}>
                    HARI
                  </span>
                </div>
                <p className={`text-[11px] font-semibold ${
                  selectedTheme === 'ivory' ? 'text-stone-600' : 'text-stone-300'
                }`}>
                  {isFullyCompleted 
                    ? '✨ 100% Selesai Ditunaikan (Alhamdulillah)' 
                    : `Baki Sebanyak ${remainingPercent}% Daripada Sasaran`}
                </p>
              </div>

              {/* 3 Metric Grid */}
              <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                <div className={`rounded-lg p-2 border ${
                  selectedTheme === 'ivory'
                    ? 'bg-white border-stone-200 shadow-2xs text-stone-900'
                    : 'bg-black/20 border-white/10 text-white'
                }`}>
                  <div className={`text-[9px] font-bold ${
                    selectedTheme === 'ivory' ? 'text-stone-500' : 'opacity-75'
                  }`}>
                    SASARAN
                  </div>
                  <div className="text-sm font-bold mt-0.5 font-mono">{totalRequired} Hari</div>
                </div>

                <div className={`rounded-lg p-2 border ${
                  selectedTheme === 'ivory'
                    ? 'bg-white border-stone-200 shadow-2xs text-stone-900'
                    : 'bg-black/20 border-white/10 text-white'
                }`}>
                  <div className={`text-[9px] font-bold ${
                    selectedTheme === 'ivory' ? 'text-stone-500' : 'opacity-75'
                  }`}>
                    SELESAI
                  </div>
                  <div className={`text-sm font-bold mt-0.5 font-mono ${
                    selectedTheme === 'ivory' ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    {totalCompleted} Hari
                  </div>
                </div>

                <div className={`rounded-lg p-2 border ${
                  selectedTheme === 'ivory'
                    ? 'bg-white border-stone-200 shadow-2xs text-stone-900'
                    : 'bg-black/20 border-white/10 text-white'
                }`}>
                  <div className={`text-[9px] font-bold ${
                    selectedTheme === 'ivory' ? 'text-stone-500' : 'opacity-75'
                  }`}>
                    BAKI %
                  </div>
                  <div className={`text-sm font-bold mt-0.5 font-mono ${
                    selectedTheme === 'ivory' ? 'text-amber-700' : 'text-amber-300'
                  }`}>
                    {remainingPercent}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className={`flex justify-between text-[10px] font-bold ${
                  selectedTheme === 'ivory' ? 'text-stone-900' : 'text-white'
                }`}>
                  <span>KEMAJUAN</span>
                  <span className={selectedTheme === 'ivory' ? 'text-amber-700 font-bold' : 'text-amber-400'}>
                    {progressPercent}% SELESAI
                  </span>
                </div>
                <div className={`h-2.5 w-full rounded-full overflow-hidden ${
                  selectedTheme === 'ivory' ? 'bg-stone-200' : 'bg-white/20'
                }`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedTheme === 'ivory' 
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' 
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Quote */}
              <div className={`rounded-lg p-2.5 text-center border text-[10px] ${
                selectedTheme === 'ivory'
                  ? 'bg-emerald-50/90 border-emerald-200 text-stone-900 shadow-2xs'
                  : 'bg-black/15 border-white/10 text-white'
              }`}>
                <p className={`font-amiri text-xs mb-0.5 font-bold ${
                  selectedTheme === 'ivory' ? 'text-emerald-800' : 'text-emerald-300'
                }`}>
                  اللَّهُمَّ تَقَبَّلْ مِنَّا صِيَامَنَا وَقِيَامَنَا
                </p>
                <p className={`italic font-medium ${
                  selectedTheme === 'ivory' ? 'text-stone-700' : 'text-stone-300'
                }`}>
                  "Semoga Allah SWT menerima amalan puasa kita."
                </p>
              </div>

              {/* Card Footer */}
              <div className={`text-center mt-2.5 text-[9px] font-mono font-medium ${
                selectedTheme === 'ivory' ? 'text-emerald-800' : 'opacity-60'
              }`}>
                Dihasilkan melalui KiraPuasaKu
              </div>
            </div>

            {/* Hidden Offscreen Canvas for High-Resolution Generation */}
            <canvas ref={canvasRef} className="hidden" />

          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-stone-200/80 pt-4 dark:border-stone-800 space-y-3">
          
          {/* Direct WhatsApp & Telegram Quick Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              id="share-modal-whatsapp-btn"
              disabled={isGenerating}
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-4 text-xs font-bold shadow-2xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Kongsi ke WhatsApp</span>
            </button>

            <button
              type="button"
              id="share-modal-telegram-btn"
              disabled={isGenerating}
              onClick={handleShareTelegram}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1f8ec4] text-white py-2.5 px-4 text-xs font-bold shadow-2xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Kongsi ke Telegram</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <button
              type="button"
              id="share-modal-copy-text-btn"
              onClick={handleCopyText}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-750 transition cursor-pointer shadow-2xs"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-stone-400" />}
              <span>{isCopied ? 'Teks Telah Disalin!' : t.btnCopySummaryText}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="share-modal-download-btn"
                disabled={isGenerating}
                onClick={handleDownload}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60 transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.btnDownloadImage}</span>
              </button>

              <button
                type="button"
                id="share-modal-share-btn"
                disabled={isGenerating}
                onClick={handleShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>{t.btnShareImage}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
