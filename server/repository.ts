import { neon } from '@neondatabase/serverless';
import { SEED_LESSONS } from '../src/data/seedLessons.js';
import { createSeedChildren, SEED_DEVICE } from '../src/data/seedProfiles.js';
import type {
  AgeGroup,
  Category,
  CharNote,
  ChildProfile,
  DashboardPayload,
  HardwareDevice,
  LessonsPayload,
  LessonsQuery,
  PrimerLesson,
  ReadingProgress,
  VerseLine,
} from '../src/types/domain.js';
import { getTodayKey } from '../src/utils/date.js';

export type StorageMode = 'postgres' | 'memory';

export interface MengXueRepository {
  getDashboard(childId?: string): Promise<DashboardPayload>;
  switchActiveChild(childId: string): Promise<void>;
  listLessons(query: LessonsQuery): Promise<LessonsPayload>;
  getLessonById(
    lessonId: string,
    childId?: string
  ): Promise<{ lesson: PrimerLesson | null; progress: ReadingProgress | null }>;
  completeCheckIn(
    childId: string | undefined,
    lessonId: string,
    durationMinutes: number
  ): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }>;
  saveProgress(
    childId: string | undefined,
    lessonId: string,
    lineIndex: number
  ): Promise<ReadingProgress>;
  setTodayLesson(childId: string | undefined, lessonId: string): Promise<ChildProfile>;
  createLesson(input: Omit<PrimerLesson, 'id' | 'updatedAt'>): Promise<PrimerLesson>;
  updateLesson(lesson: PrimerLesson): Promise<PrimerLesson | null>;
  togglePublishLesson(lessonId: string): Promise<PrimerLesson | null>;
  deleteLesson(lessonId: string): Promise<boolean>;
  toggleDeviceConnection(): Promise<HardwareDevice>;
  resetDemoData(): Promise<void>;
}

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

function filterLessons(all: PrimerLesson[], query: LessonsQuery): PrimerLesson[] {
  const keyword = (query.keyword ?? '').trim().toLowerCase();
  return all.filter((lesson) => {
    if (!query.includeUnpublished && !lesson.published) {
      return false;
    }
    if (query.category && query.category !== 'all' && lesson.category !== query.category) {
      return false;
    }
    if (query.ageGroup && query.ageGroup !== 'all' && !lesson.ageGroups.includes(query.ageGroup)) {
      return false;
    }
    if (keyword) {
      const haystack = `${lesson.title} ${lesson.subtitle} ${lesson.author} ${lesson.summary}`.toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }
    return true;
  });
}

export class MemoryRepository implements MengXueRepository {
  private lessons: PrimerLesson[] = clone(SEED_LESSONS);
  private children: ChildProfile[] = createSeedChildren();
  private activeChildId: string = this.children[0].id;
  private device: HardwareDevice = clone(SEED_DEVICE);
  private progressMap = new Map<string, ReadingProgress>();

  private getActiveChild(overrideId?: string): ChildProfile {
    const targetId = overrideId ?? this.activeChildId;
    return this.children.find((c) => c.id === targetId) ?? this.children[0];
  }

  async getDashboard(childId?: string): Promise<DashboardPayload> {
    const activeChild = clone(this.getActiveChild(childId));
    const published = this.lessons.filter((l) => l.published);
    const todayLesson =
      published.find((l) => l.id === activeChild.todayLessonId) ?? published[0] ?? null;
    const planLessons = activeChild.planLessonIds
      .map((id) => published.find((l) => l.id === id))
      .filter((item): item is PrimerLesson => Boolean(item));
    const todayProgress = todayLesson
      ? (this.progressMap.get(`${activeChild.id}:${todayLesson.id}`) ?? null)
      : null;

    return {
      activeChild,
      allChildren: clone(this.children),
      todayLesson: todayLesson ? clone(todayLesson) : null,
      todayProgress: todayProgress ? clone(todayProgress) : null,
      planLessons: clone(planLessons),
      device: clone(this.device),
      fromCache: false,
    };
  }

  async switchActiveChild(childId: string): Promise<void> {
    if (this.children.some((c) => c.id === childId)) {
      this.activeChildId = childId;
    }
  }

  async listLessons(query: LessonsQuery): Promise<LessonsPayload> {
    const filtered = filterLessons(this.lessons, query);
    return {
      items: clone(filtered),
      totalCount: this.lessons.length,
      fromCache: false,
    };
  }

  async getLessonById(
    lessonId: string,
    childId?: string
  ): Promise<{ lesson: PrimerLesson | null; progress: ReadingProgress | null }> {
    const active = this.getActiveChild(childId);
    const lesson = this.lessons.find((l) => l.id === lessonId) ?? null;
    const progress = lesson ? (this.progressMap.get(`${active.id}:${lesson.id}`) ?? null) : null;
    return {
      lesson: lesson ? clone(lesson) : null,
      progress: progress ? clone(progress) : null,
    };
  }

  async completeCheckIn(
    childId: string | undefined,
    lessonId: string,
    durationMinutes: number
  ): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }> {
    const active = this.getActiveChild(childId);
    const today = getTodayKey();
    const alreadyCheckedToday = active.checkInDates.includes(today);

    if (!alreadyCheckedToday) {
      active.checkInDates.push(today);
      active.streakDays += 1;
      active.totalMinutes += durationMinutes;
    }
    if (!active.completedLessonIds.includes(lessonId)) {
      active.completedLessonIds.push(lessonId);
    }
    this.progressMap.delete(`${active.id}:${lessonId}`);

    return { child: clone(active), alreadyCheckedToday };
  }

  async saveProgress(
    childId: string | undefined,
    lessonId: string,
    lineIndex: number
  ): Promise<ReadingProgress> {
    const active = this.getActiveChild(childId);
    const entry: ReadingProgress = {
      childId: active.id,
      lessonId,
      lineIndex: Math.max(0, lineIndex),
      updatedAt: new Date().toISOString(),
    };
    this.progressMap.set(`${active.id}:${lessonId}`, entry);
    return clone(entry);
  }

  async setTodayLesson(childId: string | undefined, lessonId: string): Promise<ChildProfile> {
    const active = this.getActiveChild(childId);
    active.todayLessonId = lessonId;
    if (!active.planLessonIds.includes(lessonId)) {
      active.planLessonIds.unshift(lessonId);
    }
    return clone(active);
  }

  async createLesson(input: Omit<PrimerLesson, 'id' | 'updatedAt'>): Promise<PrimerLesson> {
    const created: PrimerLesson = {
      ...clone(input),
      id: `lesson-${Date.now().toString(36)}`,
      updatedAt: getTodayKey(),
    };
    this.lessons.unshift(created);
    return clone(created);
  }

  async updateLesson(lesson: PrimerLesson): Promise<PrimerLesson | null> {
    const idx = this.lessons.findIndex((l) => l.id === lesson.id);
    if (idx === -1) return null;
    const updated: PrimerLesson = {
      ...clone(lesson),
      updatedAt: getTodayKey(),
    };
    this.lessons[idx] = updated;
    return clone(updated);
  }

  async togglePublishLesson(lessonId: string): Promise<PrimerLesson | null> {
    const item = this.lessons.find((l) => l.id === lessonId);
    if (!item) return null;
    item.published = !item.published;
    item.updatedAt = getTodayKey();
    return clone(item);
  }

  async deleteLesson(lessonId: string): Promise<boolean> {
    const prev = this.lessons.length;
    this.lessons = this.lessons.filter((l) => l.id !== lessonId);
    return this.lessons.length < prev;
  }

  async toggleDeviceConnection(): Promise<HardwareDevice> {
    this.device.connected = !this.device.connected;
    this.device.lastSyncedAt = this.device.connected ? '刚刚已重连' : '已断开蓝牙';
    return clone(this.device);
  }

  async resetDemoData(): Promise<void> {
    this.lessons = clone(SEED_LESSONS);
    this.children = createSeedChildren();
    this.activeChildId = this.children[0].id;
    this.device = clone(SEED_DEVICE);
    this.progressMap.clear();
  }
}

interface DbLessonRow {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  category: Category;
  age_groups: AgeGroup[];
  duration_minutes: number;
  summary: string;
  parent_guide: string;
  published: boolean;
  lines: VerseLine[];
  char_notes: CharNote[];
  updated_at: string;
}

interface DbChildRow {
  id: string;
  name: string;
  age_label: string;
  avatar_emoji: string;
  streak_days: number;
  total_minutes: number;
  today_lesson_id: string;
  plan_lesson_ids: string[];
  completed_lesson_ids: string[];
  is_active: boolean;
}

function mapLessonRow(row: DbLessonRow): PrimerLesson {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    category: row.category,
    ageGroups: row.age_groups,
    durationMinutes: row.duration_minutes,
    summary: row.summary,
    parentGuide: row.parent_guide,
    published: row.published,
    lines: row.lines,
    charNotes: row.char_notes,
    updatedAt: row.updated_at,
  };
}

export class PostgresRepository implements MengXueRepository {
  private initialized = false;

  private getSql() {
    const conn = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!conn) {
      throw new Error('DATABASE_URL is not configured');
    }
    return neon(conn);
  }

  private async ensureSchemaAndSeed(): Promise<void> {
    if (this.initialized) return;
    const sql = this.getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        age_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
        duration_minutes INTEGER NOT NULL DEFAULT 5,
        summary TEXT NOT NULL DEFAULT '',
        parent_guide TEXT NOT NULL DEFAULT '',
        published BOOLEAN NOT NULL DEFAULT TRUE,
        lines JSONB NOT NULL DEFAULT '[]'::jsonb,
        char_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TEXT NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS children (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age_label TEXT NOT NULL,
        avatar_emoji TEXT NOT NULL DEFAULT '🦁',
        streak_days INTEGER NOT NULL DEFAULT 0,
        total_minutes INTEGER NOT NULL DEFAULT 0,
        today_lesson_id TEXT NOT NULL DEFAULT '',
        plan_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        completed_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        child_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        checkin_date TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (child_id, checkin_date)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS reading_progress (
        child_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        line_index INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (child_id, lesson_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS hardware_devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        connected BOOLEAN NOT NULL DEFAULT TRUE,
        battery INTEGER NOT NULL DEFAULT 86,
        firmware TEXT NOT NULL DEFAULT 'v2.4.1',
        last_synced_at TEXT NOT NULL DEFAULT '刚刚同步'
      )
    `;

    const existing = await sql`SELECT COUNT(*)::int AS cnt FROM lessons`;
    if ((existing[0]?.cnt as number) === 0) {
      await this.seedRows();
    }

    this.initialized = true;
  }

  private async seedRows(): Promise<void> {
    const sql = this.getSql();
    for (const l of SEED_LESSONS) {
      await sql`
        INSERT INTO lessons (
          id, title, subtitle, author, category, age_groups, duration_minutes,
          summary, parent_guide, published, lines, char_notes, updated_at
        ) VALUES (
          ${l.id}, ${l.title}, ${l.subtitle}, ${l.author}, ${l.category},
          ${JSON.stringify(l.ageGroups)}::jsonb, ${l.durationMinutes},
          ${l.summary}, ${l.parentGuide}, ${l.published},
          ${JSON.stringify(l.lines)}::jsonb, ${JSON.stringify(l.charNotes)}::jsonb,
          ${l.updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    const seedChildren = createSeedChildren();
    for (let i = 0; i < seedChildren.length; i += 1) {
      const c = seedChildren[i];
      await sql`
        INSERT INTO children (
          id, name, age_label, avatar_emoji, streak_days, total_minutes,
          today_lesson_id, plan_lesson_ids, completed_lesson_ids, is_active
        ) VALUES (
          ${c.id}, ${c.name}, ${c.ageLabel}, ${c.avatarEmoji}, ${c.streakDays},
          ${c.totalMinutes}, ${c.todayLessonId},
          ${JSON.stringify(c.planLessonIds)}::jsonb,
          ${JSON.stringify(c.completedLessonIds)}::jsonb, ${i === 0}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      for (const dateKey of c.checkInDates) {
        await sql`
          INSERT INTO checkins (child_id, lesson_id, checkin_date, duration_minutes)
          VALUES (${c.id}, ${c.todayLessonId}, ${dateKey}, 5)
          ON CONFLICT (child_id, checkin_date) DO NOTHING
        `;
      }
    }

    await sql`
      INSERT INTO hardware_devices (id, name, model, connected, battery, firmware, last_synced_at)
      VALUES (
        ${SEED_DEVICE.id}, ${SEED_DEVICE.name}, ${SEED_DEVICE.model},
        ${SEED_DEVICE.connected}, ${SEED_DEVICE.battery}, ${SEED_DEVICE.firmware},
        ${SEED_DEVICE.lastSyncedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  private async loadChildrenWithCheckIns(): Promise<{
    allChildren: ChildProfile[];
    activeId: string;
  }> {
    const sql = this.getSql();
    const rows = (await sql`SELECT * FROM children ORDER BY id ASC`) as unknown as DbChildRow[];
    const checkinRows = (await sql`
      SELECT child_id, checkin_date FROM checkins ORDER BY checkin_date ASC
    `) as unknown as Array<{ child_id: string; checkin_date: string }>;

    const datesByChild = new Map<string, string[]>();
    for (const r of checkinRows) {
      const arr = datesByChild.get(r.child_id) ?? [];
      arr.push(r.checkin_date);
      datesByChild.set(r.child_id, arr);
    }

    let activeId = rows[0]?.id ?? 'child-lele';
    const allChildren: ChildProfile[] = rows.map((row) => {
      if (row.is_active) activeId = row.id;
      return {
        id: row.id,
        name: row.name,
        ageLabel: row.age_label,
        avatarEmoji: row.avatar_emoji,
        streakDays: row.streak_days,
        totalMinutes: row.total_minutes,
        todayLessonId: row.today_lesson_id,
        planLessonIds: row.plan_lesson_ids ?? [],
        completedLessonIds: row.completed_lesson_ids ?? [],
        checkInDates: datesByChild.get(row.id) ?? [],
      };
    });

    return { allChildren, activeId };
  }

  async getDashboard(childId?: string): Promise<DashboardPayload> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();

    const { allChildren, activeId } = await this.loadChildrenWithCheckIns();
    const targetId = childId ?? activeId;
    const activeChild = allChildren.find((c) => c.id === targetId) ?? allChildren[0];

    const lessonRows = (await sql`
      SELECT * FROM lessons WHERE published = TRUE ORDER BY updated_at DESC, id ASC
    `) as unknown as DbLessonRow[];
    const published = lessonRows.map(mapLessonRow);

    const todayLesson =
      published.find((l) => l.id === activeChild.todayLessonId) ?? published[0] ?? null;

    const planLessons = activeChild.planLessonIds
      .map((id) => published.find((l) => l.id === id))
      .filter((item): item is PrimerLesson => Boolean(item));

    let todayProgress: ReadingProgress | null = null;
    if (todayLesson) {
      const progRows = await sql`
        SELECT child_id, lesson_id, line_index, updated_at
        FROM reading_progress
        WHERE child_id = ${activeChild.id} AND lesson_id = ${todayLesson.id}
        LIMIT 1
      `;
      if (progRows[0]) {
        todayProgress = {
          childId: String(progRows[0].child_id),
          lessonId: String(progRows[0].lesson_id),
          lineIndex: Number(progRows[0].line_index),
          updatedAt: new Date(String(progRows[0].updated_at)).toISOString(),
        };
      }
    }

    const devRows = await sql`SELECT * FROM hardware_devices LIMIT 1`;
    const d = devRows[0];
    const device: HardwareDevice = d
      ? {
          id: String(d.id),
          name: String(d.name),
          model: String(d.model),
          connected: Boolean(d.connected),
          battery: Number(d.battery),
          firmware: String(d.firmware),
          lastSyncedAt: String(d.last_synced_at),
        }
      : clone(SEED_DEVICE);

    return {
      activeChild,
      allChildren,
      todayLesson,
      todayProgress,
      planLessons,
      device,
      fromCache: false,
    };
  }

  async switchActiveChild(childId: string): Promise<void> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    await sql`UPDATE children SET is_active = (id = ${childId})`;
  }

  async listLessons(query: LessonsQuery): Promise<LessonsPayload> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const rows = (await sql`
      SELECT * FROM lessons ORDER BY updated_at DESC, id ASC
    `) as unknown as DbLessonRow[];
    const all = rows.map(mapLessonRow);
    return {
      items: filterLessons(all, query),
      totalCount: all.length,
      fromCache: false,
    };
  }

  async getLessonById(
    lessonId: string,
    childId?: string
  ): Promise<{ lesson: PrimerLesson | null; progress: ReadingProgress | null }> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const rows = (await sql`
      SELECT * FROM lessons WHERE id = ${lessonId} LIMIT 1
    `) as unknown as DbLessonRow[];
    const lesson = rows[0] ? mapLessonRow(rows[0]) : null;
    if (!lesson) {
      return { lesson: null, progress: null };
    }

    const { activeId } = await this.loadChildrenWithCheckIns();
    const targetChildId = childId ?? activeId;
    const progRows = await sql`
      SELECT child_id, lesson_id, line_index, updated_at
      FROM reading_progress
      WHERE child_id = ${targetChildId} AND lesson_id = ${lessonId}
      LIMIT 1
    `;
    const progress: ReadingProgress | null = progRows[0]
      ? {
          childId: String(progRows[0].child_id),
          lessonId: String(progRows[0].lesson_id),
          lineIndex: Number(progRows[0].line_index),
          updatedAt: new Date(String(progRows[0].updated_at)).toISOString(),
        }
      : null;

    return { lesson, progress };
  }

  async completeCheckIn(
    childId: string | undefined,
    lessonId: string,
    durationMinutes: number
  ): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const { allChildren, activeId } = await this.loadChildrenWithCheckIns();
    const target = allChildren.find((c) => c.id === (childId ?? activeId)) ?? allChildren[0];
    const today = getTodayKey();

    const inserted = await sql`
      INSERT INTO checkins (child_id, lesson_id, checkin_date, duration_minutes)
      VALUES (${target.id}, ${lessonId}, ${today}, ${durationMinutes})
      ON CONFLICT (child_id, checkin_date) DO NOTHING
      RETURNING id
    `;

    const alreadyCheckedToday = inserted.length === 0;
    const nextCompleted = target.completedLessonIds.includes(lessonId)
      ? target.completedLessonIds
      : [...target.completedLessonIds, lessonId];

    if (!alreadyCheckedToday) {
      await sql`
        UPDATE children
        SET streak_days = streak_days + 1,
            total_minutes = total_minutes + ${durationMinutes},
            completed_lesson_ids = ${JSON.stringify(nextCompleted)}::jsonb
        WHERE id = ${target.id}
      `;
    } else if (!target.completedLessonIds.includes(lessonId)) {
      await sql`
        UPDATE children
        SET completed_lesson_ids = ${JSON.stringify(nextCompleted)}::jsonb
        WHERE id = ${target.id}
      `;
    }

    await sql`
      DELETE FROM reading_progress WHERE child_id = ${target.id} AND lesson_id = ${lessonId}
    `;

    const refreshed = await this.loadChildrenWithCheckIns();
    const updatedChild =
      refreshed.allChildren.find((c) => c.id === target.id) ?? refreshed.allChildren[0];
    return { child: updatedChild, alreadyCheckedToday };
  }

  async saveProgress(
    childId: string | undefined,
    lessonId: string,
    lineIndex: number
  ): Promise<ReadingProgress> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const { activeId } = await this.loadChildrenWithCheckIns();
    const targetChildId = childId ?? activeId;
    const clamped = Math.max(0, lineIndex);

    await sql`
      INSERT INTO reading_progress (child_id, lesson_id, line_index, updated_at)
      VALUES (${targetChildId}, ${lessonId}, ${clamped}, NOW())
      ON CONFLICT (child_id, lesson_id)
      DO UPDATE SET line_index = EXCLUDED.line_index, updated_at = NOW()
    `;

    return {
      childId: targetChildId,
      lessonId,
      lineIndex: clamped,
      updatedAt: new Date().toISOString(),
    };
  }

  async setTodayLesson(childId: string | undefined, lessonId: string): Promise<ChildProfile> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const { allChildren, activeId } = await this.loadChildrenWithCheckIns();
    const target = allChildren.find((c) => c.id === (childId ?? activeId)) ?? allChildren[0];
    const nextPlan = target.planLessonIds.includes(lessonId)
      ? target.planLessonIds
      : [lessonId, ...target.planLessonIds];

    await sql`
      UPDATE children
      SET today_lesson_id = ${lessonId},
          plan_lesson_ids = ${JSON.stringify(nextPlan)}::jsonb
      WHERE id = ${target.id}
    `;

    const refreshed = await this.loadChildrenWithCheckIns();
    return refreshed.allChildren.find((c) => c.id === target.id) ?? refreshed.allChildren[0];
  }

  async createLesson(input: Omit<PrimerLesson, 'id' | 'updatedAt'>): Promise<PrimerLesson> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const created: PrimerLesson = {
      ...input,
      id: `lesson-${Date.now().toString(36)}`,
      updatedAt: getTodayKey(),
    };

    await sql`
      INSERT INTO lessons (
        id, title, subtitle, author, category, age_groups, duration_minutes,
        summary, parent_guide, published, lines, char_notes, updated_at
      ) VALUES (
        ${created.id}, ${created.title}, ${created.subtitle}, ${created.author},
        ${created.category}, ${JSON.stringify(created.ageGroups)}::jsonb,
        ${created.durationMinutes}, ${created.summary}, ${created.parentGuide},
        ${created.published}, ${JSON.stringify(created.lines)}::jsonb,
        ${JSON.stringify(created.charNotes)}::jsonb, ${created.updatedAt}
      )
    `;
    return created;
  }

  async updateLesson(lesson: PrimerLesson): Promise<PrimerLesson | null> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const updatedAt = getTodayKey();
    const rows = await sql`
      UPDATE lessons
      SET title = ${lesson.title},
          subtitle = ${lesson.subtitle},
          author = ${lesson.author},
          category = ${lesson.category},
          age_groups = ${JSON.stringify(lesson.ageGroups)}::jsonb,
          duration_minutes = ${lesson.durationMinutes},
          summary = ${lesson.summary},
          parent_guide = ${lesson.parentGuide},
          published = ${lesson.published},
          lines = ${JSON.stringify(lesson.lines)}::jsonb,
          char_notes = ${JSON.stringify(lesson.charNotes)}::jsonb,
          updated_at = ${updatedAt}
      WHERE id = ${lesson.id}
      RETURNING id
    `;
    if (rows.length === 0) return null;
    return { ...lesson, updatedAt };
  }

  async togglePublishLesson(lessonId: string): Promise<PrimerLesson | null> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const updatedAt = getTodayKey();
    const rows = (await sql`
      UPDATE lessons
      SET published = NOT published, updated_at = ${updatedAt}
      WHERE id = ${lessonId}
      RETURNING *
    `) as unknown as DbLessonRow[];
    return rows[0] ? mapLessonRow(rows[0]) : null;
  }

  async deleteLesson(lessonId: string): Promise<boolean> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const rows = await sql`DELETE FROM lessons WHERE id = ${lessonId} RETURNING id`;
    return rows.length > 0;
  }

  async toggleDeviceConnection(): Promise<HardwareDevice> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    const rows = await sql`
      UPDATE hardware_devices
      SET connected = NOT connected,
          last_synced_at = CASE WHEN NOT connected THEN '刚刚已重连' ELSE '已断开蓝牙' END
      WHERE id = ${SEED_DEVICE.id}
      RETURNING *
    `;
    const d = rows[0];
    return {
      id: String(d.id),
      name: String(d.name),
      model: String(d.model),
      connected: Boolean(d.connected),
      battery: Number(d.battery),
      firmware: String(d.firmware),
      lastSyncedAt: String(d.last_synced_at),
    };
  }

  async resetDemoData(): Promise<void> {
    await this.ensureSchemaAndSeed();
    const sql = this.getSql();
    await sql`TRUNCATE TABLE checkins, reading_progress, children, lessons, hardware_devices RESTART IDENTITY`;
    await this.seedRows();
  }
}

let memoryInstance: MemoryRepository | null = null;
let postgresInstance: PostgresRepository | null = null;

export function getRepository(): { repo: MengXueRepository; storageMode: StorageMode } {
  const hasPg = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  if (hasPg) {
    if (!postgresInstance) {
      postgresInstance = new PostgresRepository();
    }
    return { repo: postgresInstance, storageMode: 'postgres' };
  }

  if (!memoryInstance) {
    memoryInstance = new MemoryRepository();
  }
  return { repo: memoryInstance, storageMode: 'memory' };
}

export function resetMemoryRepositoryForTests(): void {
  memoryInstance = new MemoryRepository();
}
