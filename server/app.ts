import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { metric } from '@vercel/functions';
import { z } from 'zod';
import { getRepository } from './repository.js';
import type { AgeGroup, Category, PrimerLesson } from '../src/types/domain.js';

const VerseLineSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  pinyin: z.array(z.string()),
  vernacular: z.string().default(''),
  parentTip: z.string().default(''),
});

const CharNoteSchema = z.object({
  char: z.string().min(1),
  pinyin: z.string().default(''),
  meaning: z.string().default(''),
  parentQuestion: z.string().default(''),
});

const LessonPayloadSchema = z.object({
  title: z.string().trim().min(1, '篇目标题不能为空'),
  subtitle: z.string().default(''),
  author: z.string().default('经典汇编'),
  category: z.enum(['mengxue', 'poetry', 'shenglv']),
  ageGroups: z.array(z.enum(['3-4', '5-6', '7-8'])).min(1),
  durationMinutes: z.number().int().min(1).max(60).default(5),
  summary: z.string().default(''),
  parentGuide: z.string().default(''),
  published: z.boolean().default(true),
  lines: z.array(VerseLineSchema).min(1),
  charNotes: z.array(CharNoteSchema).default([]),
});

const CheckInSchema = z.object({
  childId: z.string().optional(),
  lessonId: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(60).default(5),
});

const ProgressSchema = z.object({
  childId: z.string().optional(),
  lessonId: z.string().min(1),
  lineIndex: z.number().int().min(0),
});

const TodayLessonSchema = z.object({
  lessonId: z.string().min(1),
});

function emitMetric(name: string, value: number, tags: Record<string, string>): void {
  try {
    metric(name, value, tags);
  } catch {
    // No-op outside Vercel Functions runtime
  }
}

export function createApiApp() {
  const app = new Hono().basePath('/api');

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use('*', async (c, next) => {
    const start = performance.now();
    const route = c.req.path;
    try {
      await next();
      emitMetric('mengxue.api.request_duration_ms', Math.round(performance.now() - start), {
        route,
        outcome: c.res.status >= 400 ? 'error' : 'success',
      });
    } catch (err) {
      emitMetric('mengxue.api.request_duration_ms', Math.round(performance.now() - start), {
        route,
        outcome: 'error',
      });
      throw err;
    }
  });

  app.onError((err, c) => {
    console.error('[API Error]', err);
    return c.json(
      {
        code: 'ERR_INTERNAL_SERVER',
        message: err instanceof Error ? err.message : '服务开小差了，请稍后重试',
        retryable: true,
      },
      500
    );
  });

  app.get('/health', (c) => {
    const { storageMode } = getRepository();
    return c.json({
      ok: true,
      storage: storageMode,
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/dashboard', async (c) => {
    const { repo, storageMode } = getRepository();
    const childId = c.req.query('childId') || undefined;
    const payload = await repo.getDashboard(childId);
    return c.json({ ...payload, storage: storageMode });
  });

  app.post('/children/:childId/activate', async (c) => {
    const { repo } = getRepository();
    const childId = c.req.param('childId');
    await repo.switchActiveChild(childId);
    return c.json({ ok: true, activeChildId: childId });
  });

  app.post('/children/:childId/today-lesson', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = TodayLessonSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: 'ERR_VALIDATION', message: '请提供有效的篇目 ID', retryable: false },
        400
      );
    }
    const { repo } = getRepository();
    const child = await repo.setTodayLesson(c.req.param('childId'), parsed.data.lessonId);
    return c.json({ child });
  });

  app.get('/lessons', async (c) => {
    const { repo } = getRepository();
    const category = (c.req.query('category') || 'all') as Category | 'all';
    const ageGroup = (c.req.query('ageGroup') || 'all') as AgeGroup | 'all';
    const keyword = c.req.query('keyword') || '';
    const includeUnpublished = c.req.query('includeUnpublished') === 'true';

    const result = await repo.listLessons({
      category,
      ageGroup,
      keyword,
      includeUnpublished,
    });
    return c.json(result);
  });

  app.get('/lessons/:id', async (c) => {
    const { repo } = getRepository();
    const id = c.req.param('id');
    const childId = c.req.query('childId') || undefined;
    const result = await repo.getLessonById(id, childId);
    return c.json({ ...result, fromCache: false });
  });

  app.post('/lessons', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = LessonPayloadSchema.safeParse(body);
    if (!parsed.success) {
      emitMetric('mengxue.lessons.mutated', 1, { action: 'create', outcome: 'error' });
      return c.json(
        {
          code: 'ERR_VALIDATION',
          message: parsed.error.issues[0]?.message ?? '表单字段不合法',
          retryable: false,
        },
        400
      );
    }
    const { repo } = getRepository();
    const created = await repo.createLesson(parsed.data);
    emitMetric('mengxue.lessons.mutated', 1, { action: 'create', outcome: 'success' });
    return c.json({ lesson: created }, 201);
  });

  app.put('/lessons/:id', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = LessonPayloadSchema.safeParse(body);
    if (!parsed.success) {
      emitMetric('mengxue.lessons.mutated', 1, { action: 'update', outcome: 'error' });
      return c.json(
        {
          code: 'ERR_VALIDATION',
          message: parsed.error.issues[0]?.message ?? '表单字段不合法',
          retryable: false,
        },
        400
      );
    }
    const { repo } = getRepository();
    const updated = await repo.updateLesson({
      ...parsed.data,
      id: c.req.param('id'),
      updatedAt: '',
    } as PrimerLesson);
    if (!updated) {
      return c.json({ code: 'ERR_NOT_FOUND', message: '篇目不存在', retryable: false }, 404);
    }
    emitMetric('mengxue.lessons.mutated', 1, { action: 'update', outcome: 'success' });
    return c.json({ lesson: updated });
  });

  app.patch('/lessons/:id/publish', async (c) => {
    const { repo } = getRepository();
    const updated = await repo.togglePublishLesson(c.req.param('id'));
    if (!updated) {
      return c.json({ code: 'ERR_NOT_FOUND', message: '篇目不存在', retryable: false }, 404);
    }
    emitMetric('mengxue.lessons.mutated', 1, { action: 'toggle_publish', outcome: 'success' });
    const list = await repo.listLessons({ includeUnpublished: true });
    return c.json({ lesson: updated, items: list.items });
  });

  app.delete('/lessons/:id', async (c) => {
    const { repo } = getRepository();
    const deleted = await repo.deleteLesson(c.req.param('id'));
    if (!deleted) {
      return c.json({ code: 'ERR_NOT_FOUND', message: '篇目不存在', retryable: false }, 404);
    }
    emitMetric('mengxue.lessons.mutated', 1, { action: 'delete', outcome: 'success' });
    const list = await repo.listLessons({ includeUnpublished: true });
    return c.json({ ok: true, items: list.items });
  });

  app.post('/checkins', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = CheckInSchema.safeParse(body);
    if (!parsed.success) {
      emitMetric('mengxue.checkins.completed', 1, { outcome: 'error', idempotent: 'false' });
      return c.json(
        { code: 'ERR_VALIDATION', message: '打卡参数无效', retryable: false },
        400
      );
    }
    const { repo } = getRepository();
    const result = await repo.completeCheckIn(
      parsed.data.childId,
      parsed.data.lessonId,
      parsed.data.durationMinutes
    );
    emitMetric('mengxue.checkins.completed', 1, {
      outcome: 'success',
      idempotent: String(result.alreadyCheckedToday),
    });
    return c.json(result);
  });

  app.put('/progress', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = ProgressSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: 'ERR_VALIDATION', message: '阅读进度参数无效', retryable: false },
        400
      );
    }
    const { repo } = getRepository();
    const progress = await repo.saveProgress(
      parsed.data.childId,
      parsed.data.lessonId,
      parsed.data.lineIndex
    );
    return c.json({ progress });
  });

  app.post('/device/toggle', async (c) => {
    const { repo } = getRepository();
    const device = await repo.toggleDeviceConnection();
    return c.json({ device });
  });

  app.post('/demo/reset', async (c) => {
    const { repo } = getRepository();
    await repo.resetDemoData();
    return c.json({ ok: true });
  });

  return app;
}

export const apiApp = createApiApp();
