export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayKey(baseDate: Date = new Date()): string {
  return formatDateKey(baseDate);
}

export function getDaysAgoKey(daysAgo: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - daysAgo);
  return formatDateKey(d);
}

export interface DayDot {
  dateKey: string;
  weekdayLabel: string;
  dayNumber: string;
  checked: boolean;
  isToday: boolean;
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export function getLast7Days(checkInDates: string[], baseDate: Date = new Date()): DayDot[] {
  const checkedSet = new Set(checkInDates);
  const result: DayDot[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const key = formatDateKey(d);
    result.push({
      dateKey: key,
      weekdayLabel: i === 0 ? '今天' : WEEKDAY_NAMES[d.getDay()],
      dayNumber: String(d.getDate()),
      checked: checkedSet.has(key),
      isToday: i === 0,
    });
  }
  return result;
}
