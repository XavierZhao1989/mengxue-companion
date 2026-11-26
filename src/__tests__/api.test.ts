import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeCheckIn,
  createLesson,
  deleteLesson,
  fetchDashboard,
  fetchLessonById,
  fetchLessons,
  getReadingProgressSync,
  resetDemoData,
  saveReadingProgressSync,
  setTodayLesson,
  togglePublishLesson,
  updateLesson,
} from '../services/api';
import { clearMemoryStorage } from '../services/storage';

describe('MengXue Mock API & State Transitions', () => {
  beforeEach(() => {
    clearMemoryStorage();
    resetDemoData();
  });

  it('fetches normal dashboard with active child, today lesson, and hardware device', async () => {
    const dash = await fetchDashboard('normal');
    expect(dash.activeChild.name).toBe('乐乐');
    expect(dash.todayLesson).not.toBeNull();
    expect(dash.todayLesson?.id).toBe('sanzijing-1');
    expect(dash.device.connected).toBe(true);
    expect(dash.fromCache).toBe(false);
  });

  it('returns empty dashboard payload in empty simulation mode', async () => {
    const dash = await fetchDashboard('empty');
    expect(dash.todayLesson).toBeNull();
    expect(dash.planLessons).toHaveLength(0);
    expect(dash.activeChild.streakDays).toBe(0);
  });

  it('throws structured ApiError in error mode', async () => {
    await expect(fetchDashboard('error')).rejects.toMatchObject({
      code: 'ERR_NETWORK_TIMEOUT',
      retryable: true,
    });
  });

  it('serves cached reads in offline mode while rejecting mutations cleanly', async () => {
    const dash = await fetchDashboard('offline');
    expect(dash.fromCache).toBe(true);
    expect(dash.todayLesson).not.toBeNull();

    await expect(completeCheckIn('sanzijing-1', 5, 'offline')).rejects.toMatchObject({
      code: 'ERR_OFFLINE_MUTATION',
      retryable: true,
    });
  });

  it('aborts in-flight requests cleanly via AbortController to prevent stale race conditions', async () => {
    const controller = new AbortController();
    const pending = fetchDashboard('slow', controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/i);
  });

  it('completes check-in idempotently for the same day and clears temporary reading progress', async () => {
    saveReadingProgressSync('child-lele', 'sanzijing-1', 2);
    expect(getReadingProgressSync('child-lele', 'sanzijing-1')?.lineIndex).toBe(2);

    const first = await completeCheckIn('sanzijing-1', 5, 'normal');
    expect(first.alreadyCheckedToday).toBe(false);
    expect(first.child.streakDays).toBe(7);
    expect(first.child.totalMinutes).toBe(53);
    expect(getReadingProgressSync('child-lele', 'sanzijing-1')).toBeNull();

    const second = await completeCheckIn('sanzijing-1', 5, 'normal');
    expect(second.alreadyCheckedToday).toBe(true);
    expect(second.child.streakDays).toBe(7);
    expect(second.child.totalMinutes).toBe(53);
  });

  it('supports admin create, publish toggle, update, and delete reflected immediately in parent library', async () => {
    const created = await createLesson({
      title: '登鹳雀楼',
      subtitle: '登高望远的开阔心胸',
      author: '王之涣（唐）',
      category: 'poetry',
      ageGroups: ['5-6', '7-8'],
      durationMinutes: 4,
      summary: '短短二十字写尽壮阔山河与积极向上的心境。',
      parentGuide: '和孩子一起做“往上看、往远看”的动作。',
      published: true,
      lines: [
        {
          id: 'dgql-1',
          text: '白日依山尽，',
          pinyin: ['bái', 'rì', 'yī', 'shān', 'jìn', ''],
          vernacular: '太阳顺着山头慢慢落下去。',
          parentTip: '问问傍晚天边颜色的变化。',
        },
      ],
      charNotes: [],
    });

    let parentList = await fetchLessons({ keyword: '登鹳雀楼' }, 'normal');
    expect(parentList.items.map((i) => i.id)).toContain(created.id);

    await togglePublishLesson(created.id);
    parentList = await fetchLessons({ includeUnpublished: false, keyword: '登鹳雀楼' }, 'normal');
    expect(parentList.items).toHaveLength(0);

    const adminList = await fetchLessons({ includeUnpublished: true, keyword: '登鹳雀楼' }, 'normal');
    expect(adminList.items).toHaveLength(1);

    await updateLesson({ ...created, title: '登鹳雀楼（精讲版）', published: true });
    const fetched = await fetchLessonById(created.id, 'normal');
    expect(fetched.lesson?.title).toBe('登鹳雀楼（精讲版）');

    await deleteLesson(created.id);
    const afterDelete = await fetchLessonById(created.id, 'normal');
    expect(afterDelete.lesson).toBeNull();
  });

  it('filters library by category and age group and allows setting today lesson', async () => {
    const poetryFor34 = await fetchLessons({ category: 'poetry', ageGroup: '3-4' }, 'normal');
    expect(poetryFor34.items.length).toBeGreaterThanOrEqual(2);
    expect(poetryFor34.items.every((l) => l.category === 'poetry' && l.ageGroups.includes('3-4'))).toBe(true);

    const updatedChild = await setTodayLesson('jingyesi-1', 'normal');
    expect(updatedChild.todayLessonId).toBe('jingyesi-1');
  });
});
