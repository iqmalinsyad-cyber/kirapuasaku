import { Language } from '../types';
import { getTranslation } from '../translations';

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
