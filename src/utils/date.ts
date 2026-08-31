import { Language } from '../types';
import { getTranslation } from '../translations';

export interface HijriDateInfo {
  day: number;
  month: number; // 1 to 12
  year: number;
  monthName: string;
  formatted: string;
  isForbidden: boolean;
  forbiddenReason?: string;
  isSunnah: boolean;
  sunnahReason?: string;
  specialEvent?: string;
}

export const HIJRI_MONTHS_MS = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jamadilawal',
  'Jamadilakhir',
  'Rejab',
  'Syaaban',
  'Ramadan',
  'Syawal',
  'Zulkaedah',
  'Zulhijjah',
];

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  'Sha\'ban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qi\'dah',
  'Dhu al-Hijjah',
];

/**
 * Standard Malaysian State Zakat Fidyah Rates & Official Portals
 */
export interface StateFidyahInfo {
  id: string;
  nameMs: string;
  nameEn: string;
  agencyName: string;
  ratePerDay: number; // RM per day per missed year
  websiteUrl: string;
  fidyahCalculatorUrl: string;
}

export const STATE_FIDYAH_RATES: StateFidyahInfo[] = [
  {
    id: 'selangor',
    nameMs: 'Selangor',
    nameEn: 'Selangor',
    agencyName: 'Lembaga Zakat Selangor (LZS)',
    ratePerDay: 2.00, // Standard rate (Grade 1 RM2.00, Grade 2 RM4.00)
    websiteUrl: 'https://www.zakatselangor.com.my',
    fidyahCalculatorUrl: 'https://fidyah.zakatselangor.com.my',
  },
  {
    id: 'wp',
    nameMs: 'Wilayah Persekutuan (KL, Putrajaya, Labuan)',
    nameEn: 'Federal Territory (KL, Putrajaya, Labuan)',
    agencyName: 'Pusat Pungutan Zakat (PPZ-MAIWP)',
    ratePerDay: 4.00,
    websiteUrl: 'https://www.zakat.com.my',
    fidyahCalculatorUrl: 'https://www.zakat.com.my/info-zakat/jenis-jenis-zakat/zakat-fidyah/',
  },
  {
    id: 'kedah',
    nameMs: 'Kedah',
    nameEn: 'Kedah',
    agencyName: 'Lembaga Zakat Negeri Kedah (LZNK)',
    ratePerDay: 2.10,
    websiteUrl: 'https://www.zakatkedah.com.my',
    fidyahCalculatorUrl: 'https://www.zakatkedah.com.my/fidyah/',
  },
  {
    id: 'johor',
    nameMs: 'Johor',
    nameEn: 'Johor',
    agencyName: 'Majlis Agama Islam Negeri Johor (MAINJ)',
    ratePerDay: 3.00,
    websiteUrl: 'https://www.mainj.gov.my',
    fidyahCalculatorUrl: 'https://epay.mainj.gov.my',
  },
  {
    id: 'penang',
    nameMs: 'Pulau Pinang',
    nameEn: 'Penang',
    agencyName: 'Zakat Pulau Pinang (MAINPP)',
    ratePerDay: 2.50,
    websiteUrl: 'https://zakatpenang.com',
    fidyahCalculatorUrl: 'https://zakatpenang.com/fidyah/',
  },
  {
    id: 'perak',
    nameMs: 'Perak',
    nameEn: 'Perak',
    agencyName: 'Majlis Agama Islam & Adat Melayu Perak (MAIPk)',
    ratePerDay: 2.10,
    websiteUrl: 'https://www.maiamp.gov.my',
    fidyahCalculatorUrl: 'https://ezakat.maiamp.gov.my',
  },
  {
    id: 'melaka',
    nameMs: 'Melaka',
    nameEn: 'Melaka',
    agencyName: 'Zakat Melaka (MAIM)',
    ratePerDay: 2.10,
    websiteUrl: 'https://www.izakat.com',
    fidyahCalculatorUrl: 'https://www.izakat.com',
  },
  {
    id: 'nsembilan',
    nameMs: 'Negeri Sembilan',
    nameEn: 'Negeri Sembilan',
    agencyName: 'Pusat Zakat Negeri Sembilan (PZNS)',
    ratePerDay: 2.00,
    websiteUrl: 'https://www.zakatns2u.biz',
    fidyahCalculatorUrl: 'https://www.zakatns2u.biz',
  },
  {
    id: 'pahang',
    nameMs: 'Pahang',
    nameEn: 'Pahang',
    agencyName: 'Pusat Kutipan Zakat Pahang (MUIP)',
    ratePerDay: 2.00,
    websiteUrl: 'https://www.zakatpahang.my',
    fidyahCalculatorUrl: 'https://ezakat.zakatpahang.my',
  },
  {
    id: 'terengganu',
    nameMs: 'Terengganu',
    nameEn: 'Terengganu',
    agencyName: 'Majlis Agama Islam dan Adat Melayu Terengganu (MAIDAM)',
    ratePerDay: 2.10,
    websiteUrl: 'https://maidam.terengganu.gov.my',
    fidyahCalculatorUrl: 'https://maidam.terengganu.gov.my',
  },
  {
    id: 'kelantan',
    nameMs: 'Kelantan',
    nameEn: 'Kelantan',
    agencyName: 'Majlis Agama Islam dan Adat Istiadat Melayu Kelantan (MAIK)',
    ratePerDay: 2.10,
    websiteUrl: 'https://www.e-maik.my',
    fidyahCalculatorUrl: 'https://www.e-maik.my',
  },
  {
    id: 'sabah',
    nameMs: 'Sabah',
    nameEn: 'Sabah',
    agencyName: 'Majlis Ugama Islam Sabah (MUIS)',
    ratePerDay: 2.50,
    websiteUrl: 'https://zakat.sabah.gov.my',
    fidyahCalculatorUrl: 'https://zakat.sabah.gov.my',
  },
  {
    id: 'sarawak',
    nameMs: 'Sarawak',
    nameEn: 'Sarawak',
    agencyName: 'Tabung Baitulmal Sarawak (TBS)',
    ratePerDay: 2.00,
    websiteUrl: 'https://www.tbs.org.my',
    fidyahCalculatorUrl: 'https://pelanggan.tbs.org.my',
  },
  {
    id: 'perlis',
    nameMs: 'Perlis',
    nameEn: 'Perlis',
    agencyName: 'Majlis Agama Islam dan Adat Istiadat Melayu Perlis (MAIPs)',
    ratePerDay: 2.00,
    websiteUrl: 'https://www.maips.gov.my',
    fidyahCalculatorUrl: 'https://www.maips.gov.my',
  },
];

/**
 * Converts a Gregorian date string (YYYY-MM-DD) or Date object to Islamic Hijri Calendar Date
 * Calibrated for Malaysian / JAKIM e-Solat Takwim (https://www.e-solat.gov.my/index.php?siteId=24&pageId=26)
 */
export function getHijriDate(dateInput: string | Date, adjustmentDays: number = 0, lang: Language = 'ms'): HijriDateInfo {
  let date: Date;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('-').map(Number);
    // Use midday to avoid any local timezone shifts
    date = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    date = new Date(dateInput);
  }

  // Add optional moon-sighting adjustment (+/- days)
  if (adjustmentDays !== 0) {
    date = new Date(date.getTime() + adjustmentDays * 86400000);
  }

  let hijriDay = 1;
  let hijriMonth = 1;
  let hijriYear = 1448;

  let intlSuccess = false;
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Kuala_Lumpur',
    });
    const parts = formatter.formatToParts(date);
    const dVal = parts.find((p) => p.type === 'day')?.value;
    const mVal = parts.find((p) => p.type === 'month')?.value;
    const yVal = parts.find((p) => p.type === 'year')?.value;

    if (dVal && mVal && yVal) {
      hijriDay = parseInt(dVal, 10);
      hijriMonth = parseInt(mVal, 10);
      hijriYear = parseInt(yVal.replace(/[^0-9]/g, ''), 10);
      intlSuccess = true;
    }
  } catch {
    intlSuccess = false;
  }

  // Calibrated astronomical algorithm fallback (aligned with JAKIM e-Solat)
  if (!intlSuccess) {
    const calDate = new Date(date.getTime() + 86400000); // 1-day alignment for Malaysia Takwim
    const y = calDate.getFullYear();
    let m = calDate.getMonth() + 1;
    const d = calDate.getDate();

    let jd: number;
    if (m <= 2) {
      const yr = y - 1;
      const mn = m + 12;
      const a = Math.floor(yr / 100);
      const b = 2 - a + Math.floor(a / 4);
      jd = Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mn + 1)) + d + b - 1524.5;
    } else {
      const a = Math.floor(y / 100);
      const b = 2 - a + Math.floor(a / 4);
      jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
    }

    const z = Math.floor(jd + 0.5);
    const l = z - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
    const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    hijriMonth = Math.floor((24 * l3) / 709);
    hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
    hijriYear = 30 * n + j - 30;
  }

  const monthIndex = Math.max(0, Math.min(11, hijriMonth - 1));
  const monthNames = lang === 'ms' ? HIJRI_MONTHS_MS : HIJRI_MONTHS_EN;
  const monthName = monthNames[monthIndex];
  const formatted = `${hijriDay} ${monthName} ${hijriYear}H`;

  // Determine Forbidden Fasting Days (Haram Berpuasa)
  let isForbidden = false;
  let forbiddenReason: string | undefined;

  // 1 Syawal (Hari Raya Aidilfitri)
  if (hijriMonth === 10 && hijriDay === 1) {
    isForbidden = true;
    forbiddenReason = lang === 'ms' 
      ? '1 Syawal (Hari Raya Aidilfitri) - Diharamkan berpuasa' 
      : '1 Shawwal (Eid al-Fitr) - Fasting is strictly prohibited';
  }
  // 10 Zulhijjah (Hari Raya Aidiladha)
  else if (hijriMonth === 12 && hijriDay === 10) {
    isForbidden = true;
    forbiddenReason = lang === 'ms' 
      ? '10 Zulhijjah (Hari Raya Aidiladha) - Diharamkan berpuasa' 
      : '10 Dhu al-Hijjah (Eid al-Adha) - Fasting is strictly prohibited';
  }
  // 11, 12, 13 Zulhijjah (Hari-hari Tasyrik)
  else if (hijriMonth === 12 && (hijriDay === 11 || hijriDay === 12 || hijriDay === 13)) {
    isForbidden = true;
    forbiddenReason = lang === 'ms' 
      ? `${hijriDay} Zulhijjah (Hari Tasyrik) - Diharamkan berpuasa` 
      : `${hijriDay} Dhu al-Hijjah (Tashreeq Day) - Fasting is strictly prohibited`;
  }

  // Determine Special Events & Sunnah Fasting Days
  let isSunnah = false;
  let sunnahReason: string | undefined;
  let specialEvent: string | undefined;

  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, 4 = Thu
  if (!isForbidden) {
    // Isnin & Khamis
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      isSunnah = true;
      sunnahReason = lang === 'ms' ? 'Hari Sunnah (Isnin / Khamis)' : 'Sunnah Fasting (Monday / Thursday)';
    }

    // Hari Putih (Ayyamul Bidh: 13, 14, 15 of Hijri month, except 13 Zulhijjah which is Tasyrik)
    if ((hijriDay === 13 || hijriDay === 14 || hijriDay === 15) && !(hijriMonth === 12 && hijriDay === 13)) {
      isSunnah = true;
      sunnahReason = lang === 'ms' ? `Hari Putih (Ayyamul Bidh - ${hijriDay} ${monthName})` : `White Days (Ayyam al-Bidh - ${hijriDay} ${monthName})`;
    }

    // Hari Arafah (9 Zulhijjah)
    if (hijriMonth === 12 && hijriDay === 9) {
      isSunnah = true;
      sunnahReason = lang === 'ms' ? 'Hari Arafah (9 Zulhijjah) - Sangat Dituntut' : 'Day of Arafah (9 Dhu al-Hijjah) - Highly Recommended';
      specialEvent = lang === 'ms' ? 'Hari Arafah' : 'Day of Arafah';
    }

    // Hari Asyura & Tasu'a (9 & 10 Muharram)
    if (hijriMonth === 1 && (hijriDay === 9 || hijriDay === 10)) {
      isSunnah = true;
      sunnahReason = lang === 'ms' 
        ? `Puasa Sunat ${hijriDay === 10 ? 'Asyura (10 Muharram)' : 'Tasu\'a (9 Muharram)'}` 
        : `Sunnah Fast of ${hijriDay === 10 ? 'Ashura' : 'Tasu\'a'}`;
      specialEvent = hijriDay === 10 ? (lang === 'ms' ? 'Hari Asyura' : 'Day of Ashura') : undefined;
    }

    // Puasa 6 Syawal (2 - 30 Syawal)
    if (hijriMonth === 10 && hijriDay >= 2 && hijriDay <= 30) {
      specialEvent = lang === 'ms' ? 'Bulan Syawal (Sunat 6 Hari)' : 'Month of Shawwal (Six Sunnah Fasts)';
    }

    // Nisfu Syaaban (15 Syaaban)
    if (hijriMonth === 8 && hijriDay === 15) {
      specialEvent = lang === 'ms' ? 'Malam Nisfu Syaaban' : 'Mid-Sha\'ban (Nisfu Sha\'ban)';
    }

    // 1 Ramadan
    if (hijriMonth === 9 && hijriDay === 1) {
      specialEvent = lang === 'ms' ? '1 Ramadan (Awal Ramadan)' : '1st of Ramadan';
    }
  }

  return {
    day: hijriDay,
    month: hijriMonth,
    year: hijriYear,
    monthName,
    formatted,
    isForbidden,
    forbiddenReason,
    isSunnah,
    sunnahReason,
    specialEvent,
  };
}

/**
 * Calculates deadline and detailed countdown for Ramadan 1448 Hijrah & upcoming Ramadan
 * Calibrated with JAKIM e-Solat Takwim: 1 Ramadan 1448H = 8 Februari 2027
 */
export function getRamadan1448CountdownInfo(referenceDate: Date = new Date(), lang: Language = 'ms') {
  const currentHijri = getHijriDate(referenceDate, 0, lang);
  
  // Official target date for 1 Ramadan 1448H (8 Feb 2027)
  const ramadan1448Date = new Date(2027, 1, 8, 0, 0, 0); // 8 Feb 2027
  const ramadan1448End = new Date(2027, 2, 9, 23, 59, 59); // 9 March 2027 (End of Ramadan 1448H)
  
  const now = referenceDate;
  const diffMs = ramadan1448Date.getTime() - now.getTime();
  
  const isOngoing = now.getTime() >= ramadan1448Date.getTime() && now.getTime() <= ramadan1448End.getTime();
  const isPassed = now.getTime() > ramadan1448End.getTime();
  const isUpcoming = diffMs > 0;

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    targetHijriYear: 1448,
    targetTitle: lang === 'ms' ? '1 Ramadan 1448 Hijrah' : '1 Ramadan 1448 Hijri',
    targetGregorianFormatted: lang === 'ms' ? '8 Februari 2027 (Isnin)' : '8 February 2027 (Monday)',
    targetDate: ramadan1448Date,
    currentHijri,
    daysLeft: days,
    hoursLeft: hours,
    minutesLeft: minutes,
    secondsLeft: seconds,
    totalSecondsLeft: totalSeconds,
    isUpcoming,
    isOngoing,
    isPassed,
    officialPortalUrl: 'https://www.e-solat.gov.my/index.php?siteId=24&pageId=26',
  };
}

/**
 * Calculates deadline for Qada before next Ramadan (1 Ramadan)
 */
export function getNextRamadanInfo(referenceDate: Date = new Date(), lang: Language = 'ms') {
  const currentHijri = getHijriDate(referenceDate, 0, lang);
  
  // Ramadan is Month 9
  let targetHijriYear = currentHijri.year;
  if (currentHijri.month >= 9) {
    // Current date is already during or after Ramadan of this Hijri year, so next Ramadan is next Hijri year
    targetHijriYear += 1;
  }

  // Exact Gregorian dates calibrated for JAKIM Malaysian Takwim
  let estimatedDate: Date;
  if (targetHijriYear === 1447) {
    estimatedDate = new Date(2026, 1, 18, 0, 0, 0); // 18 Feb 2026
  } else if (targetHijriYear === 1448) {
    estimatedDate = new Date(2027, 1, 8, 0, 0, 0); // 8 Feb 2027
  } else if (targetHijriYear === 1449) {
    estimatedDate = new Date(2028, 0, 28, 0, 0, 0); // 28 Jan 2028
  } else {
    const diffYears = targetHijriYear - 1448;
    const baseTime = new Date(2027, 1, 8).getTime();
    estimatedDate = new Date(baseTime + diffYears * 354.367 * 86400000);
  }

  const now = referenceDate;
  const diffMs = estimatedDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const isRamadanArrived = currentHijri.month === 9;
  const isPastRamadan = currentHijri.month > 9;

  return {
    targetHijriYear,
    targetRamadanFormatted: `1 Ramadan ${targetHijriYear}H`,
    estimatedGregorianDate: estimatedDate,
    estimatedGregorianFormatted: formatDateMalay(
      `${estimatedDate.getFullYear()}-${String(estimatedDate.getMonth() + 1).padStart(2, '0')}-${String(estimatedDate.getDate()).padStart(2, '0')}`,
      lang
    ),
    daysLeft,
    currentHijri,
    isRamadanArrived,
    isPastRamadan,
  };
}

export function formatDateMalay(dateStr: string, lang: Language = 'ms'): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const t = getTranslation(lang);
  const monthName = t.months[month - 1] || '';
  
  if (lang === 'ms') {
    return `${day} ${monthName} ${year}`;
  } else {
    return `${monthName} ${day}, ${year}`;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayOfWeekName(dateStr: string, lang: Language = 'ms'): string {
  const d = new Date(dateStr);
  const dayIndex = d.getDay();
  const t = getTranslation(lang);
  return t.days[dayIndex] || '';
}

export function getMonthYearTitle(year: number, monthIndex: number, lang: Language = 'ms'): string {
  const t = getTranslation(lang);
  const monthName = t.months[monthIndex];
  return `${monthName} ${year}`;
}
