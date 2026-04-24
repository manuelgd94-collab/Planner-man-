import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addDays, subDays, addMonths, subMonths, parseISO, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDate(date: Date, fmt: string): string {
  return format(date, fmt, { locale: es });
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toYearMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getDaysInMonthGrid(date: Date): (Date | null)[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });

  // getDay returns 0=Sunday ... 6=Saturday, we want Monday-first
  let startDow = getDay(start); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

  const prefix: null[] = Array(startDow).fill(null);
  return [...prefix, ...days];
}

export function isSameDayUtil(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

export function isSameMonthUtil(a: Date, b: Date): boolean {
  return isSameMonth(a, b);
}

export function isTodayUtil(date: Date): boolean {
  return isToday(date);
}

export function addDaysUtil(date: Date, n: number): Date {
  return addDays(date, n);
}

export function subDaysUtil(date: Date, n: number): Date {
  return subDays(date, n);
}

export function addMonthsUtil(date: Date, n: number): Date {
  return addMonths(date, n);
}

export function subMonthsUtil(date: Date, n: number): Date {
  return subMonths(date, n);
}

export function parseISOUtil(s: string): Date {
  return parseISO(s);
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 4 }); // Week: Thu–Wed
  const end = endOfWeek(date, { weekStartsOn: 4 });
  return eachDayOfInterval({ start, end });
}

export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getShiftWeekNumber(thursday: Date): number {
  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.round((thursday.getTime() - jan1.getTime()) / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
}
