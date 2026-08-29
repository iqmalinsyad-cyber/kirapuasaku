// Cute Muslim Avatars Collection for QadaTrack
export interface MuslimAvatar {
  id: string;
  name: string;
  gender: 'boy' | 'girl';
  descriptionMs: string;
  descriptionEn: string;
  dataUrl: string;
}

// Function to generate high quality, adorable SVG avatars
const createSvgDataUri = (svgContent: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
};

// 1. Ahmad - Cute Muslim Boy with White Kopiah & Emerald Jubah
const ahmadSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_ahmad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_ahmad)"/>
  <!-- Body/Jubah -->
  <path d="M28 116 C28 92, 42 86, 60 86 C78 86, 92 92, 92 116 Z" fill="#ecfdf5"/>
  <path d="M52 86 L60 98 L68 86 Z" fill="#a7f3d0"/>
  <!-- Neck -->
  <rect x="53" y="74" width="14" height="14" rx="4" fill="#fed7aa"/>
  <!-- Head -->
  <ellipse cx="60" cy="56" rx="26" ry="24" fill="#ffedd5"/>
  <!-- Ears -->
  <circle cx="34" cy="56" r="6" fill="#fed7aa"/>
  <circle cx="86" cy="56" r="6" fill="#fed7aa"/>
  <!-- Cheeks Blush -->
  <ellipse cx="44" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <ellipse cx="76" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <!-- Eyes -->
  <circle cx="48" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="72" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="49" cy="53" r="1.2" fill="#ffffff"/>
  <circle cx="73" cy="53" r="1.2" fill="#ffffff"/>
  <!-- Eyebrows -->
  <path d="M44 47 Q48 45 52 47" stroke="#475569" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M68 47 Q72 45 76 47" stroke="#475569" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Smile -->
  <path d="M54 63 Q60 69 66 63" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- White Kopiah / Peci with cute pattern -->
  <path d="M34 46 C34 26, 86 26, 86 46 Z" fill="#ffffff"/>
  <path d="M32 46 C32 43, 88 43, 88 46 L86 50 C86 52, 34 52, 34 50 Z" fill="#f1f5f9"/>
  <!-- Kopiah embroidery lines -->
  <path d="M42 38 Q60 33 78 38" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M46 43 Q60 39 74 43" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <!-- Small Star Sparkle -->
  <path d="M96 24 L98 28 L102 30 L98 32 L96 36 L94 32 L90 30 L94 28 Z" fill="#fef08a"/>
</svg>`;

// 2. Aisyah - Cute Muslim Girl with Pink Hijab & Floral Pin
const aisyahSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_aisyah" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_aisyah)"/>
  <!-- Hijab Base / Shoulders -->
  <path d="M22 116 C22 84, 38 74, 60 74 C82 74, 98 84, 98 116 Z" fill="#fce7f3"/>
  <!-- Inner Hijab / Headwrap -->
  <path d="M30 52 C30 26, 90 26, 90 52 C90 78, 80 84, 60 84 C40 84, 30 78, 30 52 Z" fill="#fbcfe8"/>
  <!-- Face Opening -->
  <ellipse cx="60" cy="56" rx="20" ry="21" fill="#fff1f2"/>
  <!-- Undercap (Anak Tudung) -->
  <path d="M43 40 Q60 36 77 40 Q60 33 43 40 Z" fill="#fda4af"/>
  <!-- Cheeks Blush -->
  <ellipse cx="46" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <ellipse cx="74" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <!-- Big Cute Eyes with Lashes -->
  <circle cx="49" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="71" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="50" cy="53.8" r="1.3" fill="#ffffff"/>
  <circle cx="72" cy="53.8" r="1.3" fill="#ffffff"/>
  <!-- Eyelashes -->
  <path d="M45 52 L43 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M75 52 L77 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M55 64 Q60 69 65 64" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Hijab Drape Fold -->
  <path d="M50 77 Q60 85 70 77" stroke="#f472b6" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Cute Flower Pin on Hijab -->
  <circle cx="38" cy="44" r="5" fill="#fbbf24"/>
  <circle cx="38" cy="44" r="2" fill="#d97706"/>
  <circle cx="34" cy="42" r="2.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="42" cy="42" r="2.5" fill="#ffffff" opacity="0.9"/>
  <!-- Sparkles -->
  <path d="M96 26 L98 30 L102 32 L98 34 L96 38 L94 34 L90 32 L94 30 Z" fill="#fef08a"/>
</svg>`;

// 3. Harith - Cute Muslim Boy with Black Songkok & Emerald Baju Melayu
const harithSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_harith" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_harith)"/>
  <!-- Baju Melayu Emerald -->
  <path d="M26 116 C26 92, 40 86, 60 86 C80 86, 94 92, 94 116 Z" fill="#10b981"/>
  <!-- Cekak Musang Collar & Buttons -->
  <path d="M52 86 L60 93 L68 86" stroke="#047857" stroke-width="2" fill="none"/>
  <circle cx="60" cy="98" r="1.5" fill="#fef08a"/>
  <circle cx="60" cy="105" r="1.5" fill="#fef08a"/>
  <!-- Neck -->
  <rect x="53" y="74" width="14" height="14" rx="4" fill="#fed7aa"/>
  <!-- Head -->
  <ellipse cx="60" cy="56" rx="26" ry="24" fill="#ffedd5"/>
  <!-- Ears -->
  <circle cx="34" cy="56" r="6" fill="#fed7aa"/>
  <circle cx="86" cy="56" r="6" fill="#fed7aa"/>
  <!-- Cheeks Blush -->
  <ellipse cx="44" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <ellipse cx="76" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <!-- Eyes -->
  <circle cx="48" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="72" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="49.5" cy="53" r="1.2" fill="#ffffff"/>
  <circle cx="73.5" cy="53" r="1.2" fill="#ffffff"/>
  <!-- Eyebrows -->
  <path d="M44 47 Q48 44 52 47" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M68 47 Q72 44 76 47" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Smile -->
  <path d="M54 63 Q60 69 66 63" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Songkok Baldu Hitam -->
  <path d="M34 47 C34 24, 86 24, 86 47 Z" fill="#0f172a"/>
  <path d="M32 47 L88 47 L86 50 L34 50 Z" fill="#1e293b"/>
  <!-- Songkok Gold Accent Pin -->
  <polygon points="60,28 62,33 67,33 63,36 65,41 60,38 55,41 57,36 53,33 58,33" fill="#fbbf24" transform="scale(0.5) translate(60, 20)"/>
</svg>`;

// 4. Nur Fatima - Cute Muslim Girl with Lavender Hijab
const fatimaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_fatima" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_fatima)"/>
  <!-- Hijab Drape Lavender -->
  <path d="M22 116 C22 84, 38 74, 60 74 C82 74, 98 84, 98 116 Z" fill="#ede9fe"/>
  <!-- Hijab Hood -->
  <path d="M30 52 C30 26, 90 26, 90 52 C90 78, 80 84, 60 84 C40 84, 30 78, 30 52 Z" fill="#ddd6fe"/>
  <!-- Face -->
  <ellipse cx="60" cy="56" rx="20" ry="21" fill="#fff1f2"/>
  <!-- Undercap (White) -->
  <path d="M43 40 Q60 36 77 40 Q60 34 43 40 Z" fill="#f8fafc"/>
  <!-- Cheeks Blush -->
  <ellipse cx="46" cy="63" rx="4" ry="2.8" fill="#f43f5e" opacity="0.6"/>
  <ellipse cx="74" cy="63" rx="4" ry="2.8" fill="#f43f5e" opacity="0.6"/>
  <!-- Happy Eyes (Winking / Smiling arcs) -->
  <path d="M45 54 Q49 50 53 54" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M67 54 Q71 50 75 54" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <!-- Lashes -->
  <path d="M44 54 L42 52" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M76 54 L78 52" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Sweet Smile -->
  <path d="M55 64 Q60 69 65 64" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Lavender Ribbon / Pin -->
  <circle cx="80" cy="46" r="4.5" fill="#a855f7"/>
  <circle cx="80" cy="46" r="2" fill="#ffffff"/>
  <!-- Sparkles -->
  <path d="M22 28 L24 32 L28 34 L24 36 L22 40 L20 36 L16 34 L20 32 Z" fill="#fef08a"/>
</svg>`;

// 5. Zayd - Cute Muslim Boy with Blue Kufi & Friendly Smile
const zaydSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_zayd" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_zayd)"/>
  <!-- Body/Jubah Navy -->
  <path d="M28 116 C28 92, 42 86, 60 86 C78 86, 92 92, 92 116 Z" fill="#1e293b"/>
  <path d="M54 86 L60 96 L66 86 Z" fill="#38bdf8"/>
  <!-- Neck -->
  <rect x="53" y="74" width="14" height="14" rx="4" fill="#fed7aa"/>
  <!-- Head -->
  <ellipse cx="60" cy="56" rx="26" ry="24" fill="#ffedd5"/>
  <!-- Ears -->
  <circle cx="34" cy="56" r="6" fill="#fed7aa"/>
  <circle cx="86" cy="56" r="6" fill="#fed7aa"/>
  <!-- Cheeks Blush -->
  <ellipse cx="44" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <ellipse cx="76" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <!-- Sparkly Big Eyes -->
  <circle cx="48" cy="54" r="3.8" fill="#0f172a"/>
  <circle cx="72" cy="54" r="3.8" fill="#0f172a"/>
  <circle cx="49.5" cy="52.5" r="1.4" fill="#ffffff"/>
  <circle cx="73.5" cy="52.5" r="1.4" fill="#ffffff"/>
  <circle cx="47" cy="55.5" r="0.7" fill="#ffffff"/>
  <circle cx="71" cy="55.5" r="0.7" fill="#ffffff"/>
  <!-- Happy Smile -->
  <path d="M53 63 Q60 70 67 63" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Sky Blue Kopiah / Kufi -->
  <path d="M34 46 C34 26, 86 26, 86 46 Z" fill="#38bdf8"/>
  <path d="M32 46 L88 46 L86 49 L34 49 Z" fill="#0284c7"/>
  <path d="M42 36 Q60 30 78 36" stroke="#e0f2fe" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M46 42 Q60 38 74 42" stroke="#e0f2fe" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

// 6. Maryam - Cute Muslim Girl with Mint Green Hijab
const maryamSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_maryam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_maryam)"/>
  <!-- Hijab Mint Base -->
  <path d="M22 116 C22 84, 38 74, 60 74 C82 74, 98 84, 98 116 Z" fill="#ccfbf1"/>
  <!-- Hijab Hood -->
  <path d="M30 52 C30 26, 90 26, 90 52 C90 78, 80 84, 60 84 C40 84, 30 78, 30 52 Z" fill="#99f6e4"/>
  <!-- Face -->
  <ellipse cx="60" cy="56" rx="20" ry="21" fill="#fff1f2"/>
  <!-- Undercap (Teal) -->
  <path d="M43 40 Q60 36 77 40 Q60 34 43 40 Z" fill="#5eead4"/>
  <!-- Cheeks Blush -->
  <ellipse cx="46" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <ellipse cx="74" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <!-- Cute Eyes -->
  <circle cx="49" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="71" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="50" cy="53.8" r="1.3" fill="#ffffff"/>
  <circle cx="72" cy="53.8" r="1.3" fill="#ffffff"/>
  <!-- Lashes -->
  <path d="M45 52 L43 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M75 52 L77 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M55 64 Q60 69 65 64" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Pretty Gold Pearl Pin -->
  <circle cx="36" cy="46" r="4.5" fill="#f59e0b"/>
  <circle cx="36" cy="46" r="2" fill="#fef3c7"/>
</svg>`;

// 7. Yusuf - Cute Muslim Boy with White Songkok / Peci & Gold Motif
const yusufSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_yusuf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_yusuf)"/>
  <!-- Baju Melayu Cream / Mustard -->
  <path d="M26 116 C26 92, 40 86, 60 86 C80 86, 94 92, 94 116 Z" fill="#fef3c7"/>
  <path d="M52 86 L60 93 L68 86" stroke="#d97706" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="53" y="74" width="14" height="14" rx="4" fill="#fed7aa"/>
  <!-- Head -->
  <ellipse cx="60" cy="56" rx="26" ry="24" fill="#ffedd5"/>
  <!-- Ears -->
  <circle cx="34" cy="56" r="6" fill="#fed7aa"/>
  <circle cx="86" cy="56" r="6" fill="#fed7aa"/>
  <!-- Cheeks Blush -->
  <ellipse cx="44" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <ellipse cx="76" cy="62" rx="4.5" ry="3" fill="#fca5a5" opacity="0.65"/>
  <!-- Eyes -->
  <circle cx="48" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="72" cy="54" r="3.5" fill="#1e293b"/>
  <circle cx="49.5" cy="53" r="1.2" fill="#ffffff"/>
  <circle cx="73.5" cy="53" r="1.2" fill="#ffffff"/>
  <!-- Smile -->
  <path d="M54 63 Q60 69 66 63" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- White Songkok with Gold Brim -->
  <path d="M34 47 C34 24, 86 24, 86 47 Z" fill="#ffffff"/>
  <path d="M32 47 L88 47 L86 50 L34 50 Z" fill="#fbbf24"/>
  <!-- Moon Crescent -->
  <path d="M62 30 A 5 5 0 0 0 58 38 A 6 6 0 0 1 62 30" fill="#f59e0b"/>
</svg>`;

// 8. Khadijah - Cute Muslim Girl with Peach Hijab
const khadijahSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg_khadijah" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg_khadijah)"/>
  <!-- Hijab Drape Peach -->
  <path d="M22 116 C22 84, 38 74, 60 74 C82 74, 98 84, 98 116 Z" fill="#ffedd5"/>
  <!-- Hijab Hood -->
  <path d="M30 52 C30 26, 90 26, 90 52 C90 78, 80 84, 60 84 C40 84, 30 78, 30 52 Z" fill="#fed7aa"/>
  <!-- Face -->
  <ellipse cx="60" cy="56" rx="20" ry="21" fill="#fff1f2"/>
  <!-- Undercap (White) -->
  <path d="M43 40 Q60 36 77 40 Q60 34 43 40 Z" fill="#ffffff"/>
  <!-- Cheeks Blush -->
  <ellipse cx="46" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <ellipse cx="74" cy="63" rx="4" ry="2.8" fill="#fb7185" opacity="0.6"/>
  <!-- Cute Eyes -->
  <circle cx="49" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="71" cy="55" r="3.6" fill="#1e293b"/>
  <circle cx="50" cy="53.8" r="1.3" fill="#ffffff"/>
  <circle cx="72" cy="53.8" r="1.3" fill="#ffffff"/>
  <!-- Lashes -->
  <path d="M45 52 L43 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M75 52 L77 50" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Smile -->
  <path d="M55 64 Q60 69 65 64" stroke="#e11d48" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Sweet Flower Pin -->
  <circle cx="78" cy="44" r="5" fill="#f43f5e"/>
  <circle cx="78" cy="44" r="2" fill="#fef08a"/>
</svg>`;

export const MUSLIM_AVATARS: MuslimAvatar[] = [
  {
    id: 'ahmad',
    name: 'Ahmad',
    gender: 'boy',
    descriptionMs: 'Kopiah Putih & Jubah Zamrud',
    descriptionEn: 'White Kufi & Emerald Jubah',
    dataUrl: createSvgDataUri(ahmadSvg),
  },
  {
    id: 'aisyah',
    name: 'Aisyah',
    gender: 'girl',
    descriptionMs: 'Hijab Merah Jambu & Pin Bunga',
    descriptionEn: 'Pink Hijab & Floral Pin',
    dataUrl: createSvgDataUri(aisyahSvg),
  },
  {
    id: 'harith',
    name: 'Harith',
    gender: 'boy',
    descriptionMs: 'Songkok Baldu Hitam & Baju Melayu',
    descriptionEn: 'Black Songkok & Baju Melayu',
    dataUrl: createSvgDataUri(harithSvg),
  },
  {
    id: 'fatima',
    name: 'Fatima',
    gender: 'girl',
    descriptionMs: 'Hijab Ungu Lavender Manis',
    descriptionEn: 'Sweet Lavender Hijab',
    dataUrl: createSvgDataUri(fatimaSvg),
  },
  {
    id: 'zayd',
    name: 'Zayd',
    gender: 'boy',
    descriptionMs: 'Kopiah Biru Kufi Ceria',
    descriptionEn: 'Sky Blue Kufi & Smile',
    dataUrl: createSvgDataUri(zaydSvg),
  },
  {
    id: 'maryam',
    name: 'Maryam',
    gender: 'girl',
    descriptionMs: 'Hijab Mint Green & Pin Emas',
    descriptionEn: 'Mint Green Hijab & Gold Pin',
    dataUrl: createSvgDataUri(maryamSvg),
  },
  {
    id: 'yusuf',
    name: 'Yusuf',
    gender: 'boy',
    descriptionMs: 'Songkok Putih & Sulaman Emas',
    descriptionEn: 'White Songkok & Golden Motif',
    dataUrl: createSvgDataUri(yusufSvg),
  },
  {
    id: 'khadijah',
    name: 'Khadijah',
    gender: 'girl',
    descriptionMs: 'Hijab Peach Manis & Senyuman',
    descriptionEn: 'Peach Hijab & Radiant Smile',
    dataUrl: createSvgDataUri(khadijahSvg),
  },
];

// Helper to get default avatar or resolve fallback
export const getDefaultMuslimAvatar = (): string => {
  return MUSLIM_AVATARS[0].dataUrl;
};

export const getAvatarByName = (name: string): string => {
  const match = MUSLIM_AVATARS.find((a) => a.name.toLowerCase() === name.toLowerCase() || a.id.toLowerCase() === name.toLowerCase());
  return match ? match.dataUrl : MUSLIM_AVATARS[0].dataUrl;
};
