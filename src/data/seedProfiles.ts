import type { ChildProfile, HardwareDevice } from '../types/domain';
import { getDaysAgoKey } from '../utils/date';

export function createSeedChildren(baseDate: Date = new Date()): ChildProfile[] {
  return [
    {
      id: 'child-lele',
      name: '乐乐',
      ageLabel: '5岁半 · 大班',
      avatarEmoji: '🦁',
      streakDays: 6,
      totalMinutes: 48,
      todayLessonId: 'sanzijing-1',
      planLessonIds: ['sanzijing-1', 'jingyesi-1', 'shenglv-1'],
      completedLessonIds: ['yonge-1', 'chunxiao-1', 'jingyesi-1'],
      checkInDates: [
        getDaysAgoKey(1, baseDate),
        getDaysAgoKey(2, baseDate),
        getDaysAgoKey(3, baseDate),
        getDaysAgoKey(4, baseDate),
        getDaysAgoKey(5, baseDate),
        getDaysAgoKey(6, baseDate),
      ],
    },
    {
      id: 'child-nuomi',
      name: '糯米',
      ageLabel: '3岁半 · 小班',
      avatarEmoji: '🐰',
      streakDays: 2,
      totalMinutes: 14,
      todayLessonId: 'yonge-1',
      planLessonIds: ['yonge-1', 'chunxiao-1'],
      completedLessonIds: ['chunxiao-1'],
      checkInDates: [getDaysAgoKey(1, baseDate), getDaysAgoKey(2, baseDate)],
    },
  ];
}

export const SEED_DEVICE: HardwareDevice = {
  id: 'dev-pen-s1',
  name: '小笺伴读笔 S1',
  model: 'MX-PEN-S1',
  connected: true,
  battery: 86,
  firmware: 'v2.4.1',
  lastSyncedAt: '刚刚同步',
};
