import { describe, expect, it } from 'vitest';
import { SEED_LESSONS } from '../data/seedLessons';
import { formatDateKey, getDaysAgoKey, getLast7Days } from '../utils/date';

describe('Date & Domain Seed Integrity', () => {
  it('generates 7-day dots ending on today with accurate check-in flags', () => {
    const base = new Date(2026, 10, 26); // 2026-11-26
    const checked = [getDaysAgoKey(1, base), getDaysAgoKey(3, base)];
    const dots = getLast7Days(checked, base);

    expect(dots).toHaveLength(7);
    expect(dots[6].isToday).toBe(true);
    expect(dots[6].weekdayLabel).toBe('今天');
    expect(dots[6].checked).toBe(false);
    expect(dots[5].checked).toBe(true);
    expect(dots[3].checked).toBe(true);
    expect(formatDateKey(base)).toBe('2026-11-26');
  });

  it('ensures every seed lesson has aligned pinyin arrays matching text character length', () => {
    for (const lesson of SEED_LESSONS) {
      expect(lesson.lines.length).toBeGreaterThan(0);
      for (const line of lesson.lines) {
        const chars = Array.from(line.text);
        expect(line.pinyin.length).toBe(chars.length);
      }
    }
  });
});
