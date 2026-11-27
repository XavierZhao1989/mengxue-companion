import { beforeEach, describe, expect, it } from 'vitest';
import { apiApp } from '../../server/app';
import { resetMemoryRepositoryForTests } from '../../server/repository';

describe('Hono Server API (/api/*)', () => {
  beforeEach(() => {
    resetMemoryRepositoryForTests();
  });

  it('GET /api/health returns ok status and memory storage mode when DATABASE_URL is unset', async () => {
    const res = await apiApp.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; storage: string; version: string };
    expect(body.ok).toBe(true);
    expect(body.storage).toBe('memory');
  });

  it('GET /api/dashboard returns active child, today lesson, and device', async () => {
    const res = await apiApp.request('/api/dashboard');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      activeChild: { id: string; name: string };
      todayLesson: { id: string } | null;
      device: { connected: boolean };
    };
    expect(body.activeChild.name).toBe('乐乐');
    expect(body.todayLesson?.id).toBe('sanzijing-1');
    expect(body.device.connected).toBe(true);
  });

  it('GET /api/lessons filters by category and ageGroup', async () => {
    const res = await apiApp.request('/api/lessons?category=poetry&ageGroup=3-4');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ category: string; ageGroups: string[] }>;
    };
    expect(body.items.length).toBeGreaterThanOrEqual(2);
    expect(body.items.every((l) => l.category === 'poetry' && l.ageGroups.includes('3-4'))).toBe(
      true
    );
  });

  it('POST /api/checkins is idempotent for same child and same day', async () => {
    await apiApp.request('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: 'child-lele', lessonId: 'sanzijing-1', lineIndex: 2 }),
    });

    const first = await apiApp.request('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: 'child-lele', lessonId: 'sanzijing-1', durationMinutes: 5 }),
    });
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as {
      alreadyCheckedToday: boolean;
      child: { streakDays: number; totalMinutes: number };
    };
    expect(firstJson.alreadyCheckedToday).toBe(false);
    expect(firstJson.child.streakDays).toBe(7);

    const second = await apiApp.request('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: 'child-lele', lessonId: 'sanzijing-1', durationMinutes: 5 }),
    });
    const secondJson = (await second.json()) as {
      alreadyCheckedToday: boolean;
      child: { streakDays: number };
    };
    expect(secondJson.alreadyCheckedToday).toBe(true);
    expect(secondJson.child.streakDays).toBe(7);
  });

  it('POST /api/lessons validates required title and supports create/publish/delete cycle', async () => {
    const badRes = await apiApp.request('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', category: 'poetry', ageGroups: ['3-4'], lines: [] }),
    });
    expect(badRes.status).toBe(400);

    const createRes = await apiApp.request('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '登鹳雀楼',
        subtitle: '登高望远',
        author: '王之涣（唐）',
        category: 'poetry',
        ageGroups: ['5-6'],
        durationMinutes: 4,
        summary: '经典绝句',
        parentGuide: '一起远眺想象',
        published: true,
        lines: [
          {
            id: 'l1',
            text: '白日依山尽，',
            pinyin: ['bái', 'rì', 'yī', 'shān', 'jìn', ''],
            vernacular: '太阳顺着山头落下去',
            parentTip: '观察落日颜色',
          },
        ],
        charNotes: [],
      }),
    });
    expect(createRes.status).toBe(201);
    const created = ((await createRes.json()) as { lesson: { id: string } }).lesson;

    const toggleRes = await apiApp.request(`/api/lessons/${created.id}/publish`, {
      method: 'PATCH',
    });
    expect(toggleRes.status).toBe(200);
    const toggled = ((await toggleRes.json()) as { lesson: { published: boolean } }).lesson;
    expect(toggled.published).toBe(false);

    const delRes = await apiApp.request(`/api/lessons/${created.id}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);
  });
});
