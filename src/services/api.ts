import { SEED_LESSONS } from '../data/seedLessons';
import { createSeedChildren, SEED_DEVICE } from '../data/seedProfiles';
import type {
  ApiError,
  ChildProfile,
  DashboardPayload,
  HardwareDevice,
  LessonsPayload,
  LessonsQuery,
  PrimerLesson,
  ReadingProgress,
  SimNetworkMode,
} from '../types/domain';
import { getTodayKey } from '../utils/date';
import { readStorage, removeStorage, writeStorage } from './storage';

const KEYS = {
  lessons: 'mengxue:v1:lessons',
  children: 'mengxue:v1:children',
  activeChildId: 'mengxue:v1:activeChildId',
  device: 'mengxue:v1:device',
  progress: 'mengxue:v1:progress',
};

export interface BackendHealthInfo {
  connected: boolean;
  storage: 'postgres' | 'memory' | 'local';
  label: string;
}

let remoteApiProbe: Promise<boolean> | null = null;

function isBrowserEnv(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof fetch !== 'undefined' &&
    window.location.protocol.startsWith('http')
  );
}

async function isRemoteApiAvailable(): Promise<boolean> {
  if (!isBrowserEnv()) return false;
  if (!remoteApiProbe) {
    remoteApiProbe = fetch('/api/health', { method: 'GET' })
      .then((res) => res.ok && (res.headers.get('content-type') ?? '').includes('application/json'))
      .catch(() => false);
  }
  return remoteApiProbe;
}

async function fetchRemoteJson<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw createApiError('ERR_BAD_GATEWAY', '服务端未返回有效 JSON 响应', true);
  }
  const data = (await res.json()) as T & Partial<ApiError>;
  if (!res.ok) {
    throw createApiError(
      data.code ?? `HTTP_${res.status}`,
      data.message ?? '请求失败，请稍后重试',
      data.retryable ?? res.status >= 500
    );
  }
  return data;
}

export async function fetchBackendHealth(): Promise<BackendHealthInfo> {
  if (!isBrowserEnv()) {
    return { connected: false, storage: 'local', label: '本地沙盒存储' };
  }
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { connected: false, storage: 'local', label: '本地缓存模式' };
    }
    const body = (await res.json()) as { ok?: boolean; storage?: 'postgres' | 'memory' };
    if (!body.ok) {
      return { connected: false, storage: 'local', label: '本地缓存模式' };
    }
    const storage = body.storage === 'postgres' ? 'postgres' : 'memory';
    return {
      connected: true,
      storage,
      label:
        storage === 'postgres'
          ? '云端 API · PostgreSQL 已持久化'
          : '云端 API · 在线运行中',
    };
  } catch {
    return { connected: false, storage: 'local', label: '本地缓存模式' };
  }
}

function createAbortError(): Error {
  const err = new Error('The operation was aborted.');
  err.name = 'AbortError';
  return err;
}

function createApiError(code: string, message: string, retryable = true): ApiError {
  return { code, message, retryable };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(createAbortError());
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function waitUntilAborted(signal?: AbortSignal): Promise<never> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }
  return new Promise((_, reject) => {
    signal?.addEventListener(
      'abort',
      () => {
        reject(createAbortError());
      },
      { once: true }
    );
  });
}

async function simulateNetwork(
  simMode: SimNetworkMode,
  options: { signal?: AbortSignal; isMutation?: boolean; skipDelayIfRemote?: boolean } = {}
): Promise<{ fromCache: boolean }> {
  const { signal, isMutation = false, skipDelayIfRemote = false } = options;

  if (signal?.aborted) {
    throw createAbortError();
  }

  switch (simMode) {
    case 'loading':
      return waitUntilAborted(signal);
    case 'slow':
      await sleep(2500, signal);
      return { fromCache: false };
    case 'error':
      await sleep(220, signal);
      throw createApiError(
        'ERR_NETWORK_TIMEOUT',
        '服务器开小差了，伴读内容暂未拉取成功，请稍后重试。',
        true
      );
    case 'offline':
      await sleep(120, signal);
      if (isMutation) {
        throw createApiError(
          'ERR_OFFLINE_MUTATION',
          '当前处于离线模式，已保留本地进度，联网后再同步打卡记录。',
          true
        );
      }
      return { fromCache: true };
    case 'empty':
    case 'normal':
    default:
      if (!skipDelayIfRemote) {
        await sleep(140, signal);
      }
      return { fromCache: false };
  }
}

function loadLessons(): PrimerLesson[] {
  return readStorage<PrimerLesson[]>(KEYS.lessons, SEED_LESSONS);
}

function saveLessons(lessons: PrimerLesson[]): void {
  writeStorage(KEYS.lessons, lessons);
}

function loadChildren(): ChildProfile[] {
  return readStorage<ChildProfile[]>(KEYS.children, createSeedChildren());
}

function saveChildren(children: ChildProfile[]): void {
  writeStorage(KEYS.children, children);
}

function loadActiveChildId(children: ChildProfile[]): string {
  const stored = readStorage<string>(KEYS.activeChildId, children[0]?.id ?? 'child-lele');
  if (children.some((c) => c.id === stored)) {
    return stored;
  }
  return children[0]?.id ?? 'child-lele';
}

function loadDevice(): HardwareDevice {
  return readStorage<HardwareDevice>(KEYS.device, SEED_DEVICE);
}

function saveDevice(device: HardwareDevice): void {
  writeStorage(KEYS.device, device);
}

function loadProgressMap(): Record<string, ReadingProgress> {
  return readStorage<Record<string, ReadingProgress>>(KEYS.progress, {});
}

function saveProgressMap(map: Record<string, ReadingProgress>): void {
  writeStorage(KEYS.progress, map);
}

function progressKey(childId: string, lessonId: string): string {
  return `${childId}:${lessonId}`;
}

async function shouldUseRemote(simMode: SimNetworkMode): Promise<boolean> {
  if (simMode !== 'normal' && simMode !== 'slow') return false;
  return isRemoteApiAvailable();
}

export async function fetchDashboard(
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<DashboardPayload> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, skipDelayIfRemote: true });
    const data = await fetchRemoteJson<DashboardPayload>('/dashboard', {}, signal);
    saveChildren(data.allChildren);
    writeStorage(KEYS.activeChildId, data.activeChild.id);
    saveDevice(data.device);
    return data;
  }

  const { fromCache } = await simulateNetwork(simMode, { signal });

  const children = loadChildren();
  const activeId = loadActiveChildId(children);
  const activeChild = children.find((c) => c.id === activeId) ?? children[0];
  const device = loadDevice();

  if (simMode === 'empty') {
    const emptyChild: ChildProfile = {
      ...activeChild,
      streakDays: 0,
      totalMinutes: 0,
      todayLessonId: '',
      planLessonIds: [],
      completedLessonIds: [],
      checkInDates: [],
    };
    return {
      activeChild: emptyChild,
      allChildren: children.map((c) => (c.id === emptyChild.id ? emptyChild : c)),
      todayLesson: null,
      todayProgress: null,
      planLessons: [],
      device,
      fromCache: false,
    };
  }

  const publishedLessons = loadLessons().filter((l) => l.published);
  const todayLesson =
    publishedLessons.find((l) => l.id === activeChild.todayLessonId) ??
    publishedLessons[0] ??
    null;

  const planLessons = activeChild.planLessonIds
    .map((id) => publishedLessons.find((l) => l.id === id))
    .filter((item): item is PrimerLesson => Boolean(item));

  const progressMap = loadProgressMap();
  const todayProgress = todayLesson
    ? (progressMap[progressKey(activeChild.id, todayLesson.id)] ?? null)
    : null;

  return {
    activeChild,
    allChildren: children,
    todayLesson,
    todayProgress,
    planLessons,
    device,
    fromCache,
  };
}

export async function switchActiveChild(
  childId: string,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<void> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    await fetchRemoteJson(`/children/${encodeURIComponent(childId)}/activate`, { method: 'POST' }, signal);
    writeStorage(KEYS.activeChildId, childId);
    return;
  }

  await simulateNetwork(simMode === 'empty' ? 'normal' : simMode, { signal });
  writeStorage(KEYS.activeChildId, childId);
}

export async function fetchLessons(
  query: LessonsQuery,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<LessonsPayload> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, skipDelayIfRemote: true });
    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.ageGroup) params.set('ageGroup', query.ageGroup);
    if (query.keyword) params.set('keyword', query.keyword);
    if (query.includeUnpublished) params.set('includeUnpublished', 'true');
    const qs = params.toString();
    const res = await fetchRemoteJson<LessonsPayload>(`/lessons${qs ? `?${qs}` : ''}`, {}, signal);
    if (!query.category && !query.ageGroup && !query.keyword && query.includeUnpublished) {
      saveLessons(res.items);
    }
    return res;
  }

  const { fromCache } = await simulateNetwork(simMode, { signal });

  if (simMode === 'empty') {
    return { items: [], totalCount: 0, fromCache: false };
  }

  const all = loadLessons();
  const keyword = (query.keyword ?? '').trim().toLowerCase();

  const filtered = all.filter((lesson) => {
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

  return {
    items: filtered,
    totalCount: all.length,
    fromCache,
  };
}

export async function fetchLessonById(
  lessonId: string,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<{ lesson: PrimerLesson | null; progress: ReadingProgress | null; fromCache: boolean }> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, skipDelayIfRemote: true });
    return fetchRemoteJson<{
      lesson: PrimerLesson | null;
      progress: ReadingProgress | null;
      fromCache: boolean;
    }>(`/lessons/${encodeURIComponent(lessonId)}`, {}, signal);
  }

  const { fromCache } = await simulateNetwork(simMode, { signal });

  if (simMode === 'empty') {
    return { lesson: null, progress: null, fromCache: false };
  }

  const lesson = loadLessons().find((l) => l.id === lessonId) ?? null;
  const children = loadChildren();
  const activeId = loadActiveChildId(children);
  const progressMap = loadProgressMap();
  const progress = lesson ? (progressMap[progressKey(activeId, lesson.id)] ?? null) : null;

  return { lesson, progress, fromCache };
}

export function getReadingProgressSync(childId: string, lessonId: string): ReadingProgress | null {
  const map = loadProgressMap();
  return map[progressKey(childId, lessonId)] ?? null;
}

export function saveReadingProgressSync(
  childId: string,
  lessonId: string,
  lineIndex: number
): ReadingProgress {
  const map = loadProgressMap();
  const entry: ReadingProgress = {
    childId,
    lessonId,
    lineIndex,
    updatedAt: new Date().toISOString(),
  };
  map[progressKey(childId, lessonId)] = entry;
  saveProgressMap(map);

  if (isBrowserEnv()) {
    isRemoteApiAvailable()
      .then((ok) => {
        if (!ok) return;
        return fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId, lessonId, lineIndex }),
        });
      })
      .catch(() => {
        // Ignore background sync failure; local progress is preserved
      });
  }

  return entry;
}

export function clearReadingProgressSync(childId: string, lessonId: string): void {
  const map = loadProgressMap();
  delete map[progressKey(childId, lessonId)];
  saveProgressMap(map);
}

export async function completeCheckIn(
  lessonId: string,
  durationMinutes: number,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const children = loadChildren();
    const activeId = loadActiveChildId(children);
    const res = await fetchRemoteJson<{ child: ChildProfile; alreadyCheckedToday: boolean }>(
      '/checkins',
      {
        method: 'POST',
        body: JSON.stringify({ childId: activeId, lessonId, durationMinutes }),
      },
      signal
    );
    clearReadingProgressSync(activeId, lessonId);
    return res;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });

  const children = loadChildren();
  const activeId = loadActiveChildId(children);
  const today = getTodayKey();
  let alreadyCheckedToday = false;

  const updated = children.map((child) => {
    if (child.id !== activeId) {
      return child;
    }

    alreadyCheckedToday = child.checkInDates.includes(today);
    const nextDates = alreadyCheckedToday ? child.checkInDates : [...child.checkInDates, today];
    const nextCompleted = child.completedLessonIds.includes(lessonId)
      ? child.completedLessonIds
      : [...child.completedLessonIds, lessonId];

    return {
      ...child,
      streakDays: alreadyCheckedToday ? child.streakDays : child.streakDays + 1,
      totalMinutes: alreadyCheckedToday ? child.totalMinutes : child.totalMinutes + durationMinutes,
      completedLessonIds: nextCompleted,
      checkInDates: nextDates,
    };
  });

  saveChildren(updated);
  clearReadingProgressSync(activeId, lessonId);

  const activeChild = updated.find((c) => c.id === activeId) ?? updated[0];
  return { child: activeChild, alreadyCheckedToday };
}

export async function setTodayLesson(
  lessonId: string,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<ChildProfile> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const children = loadChildren();
    const activeId = loadActiveChildId(children);
    const res = await fetchRemoteJson<{ child: ChildProfile }>(
      `/children/${encodeURIComponent(activeId)}/today-lesson`,
      {
        method: 'POST',
        body: JSON.stringify({ lessonId }),
      },
      signal
    );
    return res.child;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });

  const children = loadChildren();
  const activeId = loadActiveChildId(children);
  const updated = children.map((child) => {
    if (child.id !== activeId) {
      return child;
    }
    const nextPlan = child.planLessonIds.includes(lessonId)
      ? child.planLessonIds
      : [lessonId, ...child.planLessonIds];
    return {
      ...child,
      todayLessonId: lessonId,
      planLessonIds: nextPlan,
    };
  });

  saveChildren(updated);
  return updated.find((c) => c.id === activeId) ?? updated[0];
}

export async function togglePlanLesson(
  lessonId: string,
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<ChildProfile> {
  await simulateNetwork(simMode, { signal, isMutation: true });

  const children = loadChildren();
  const activeId = loadActiveChildId(children);
  const updated = children.map((child) => {
    if (child.id !== activeId) {
      return child;
    }
    const exists = child.planLessonIds.includes(lessonId);
    const nextPlan = exists
      ? child.planLessonIds.filter((id) => id !== lessonId)
      : [...child.planLessonIds, lessonId];
    return {
      ...child,
      planLessonIds: nextPlan,
    };
  });

  saveChildren(updated);
  return updated.find((c) => c.id === activeId) ?? updated[0];
}

export async function toggleDeviceConnection(
  simMode: SimNetworkMode,
  signal?: AbortSignal
): Promise<HardwareDevice> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const res = await fetchRemoteJson<{ device: HardwareDevice }>(
      '/device/toggle',
      { method: 'POST' },
      signal
    );
    saveDevice(res.device);
    return res.device;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });
  const current = loadDevice();
  const next: HardwareDevice = {
    ...current,
    connected: !current.connected,
    lastSyncedAt: !current.connected ? '刚刚已重连' : '已断开蓝牙',
  };
  saveDevice(next);
  return next;
}

export async function createLesson(
  input: Omit<PrimerLesson, 'id' | 'updatedAt'>,
  simMode: SimNetworkMode = 'normal',
  signal?: AbortSignal
): Promise<PrimerLesson> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const res = await fetchRemoteJson<{ lesson: PrimerLesson }>(
      '/lessons',
      { method: 'POST', body: JSON.stringify(input) },
      signal
    );
    return res.lesson;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });
  const lessons = loadLessons();
  const newLesson: PrimerLesson = {
    ...input,
    id: `lesson-${Date.now().toString(36)}`,
    updatedAt: getTodayKey(),
  };
  saveLessons([newLesson, ...lessons]);
  return newLesson;
}

export async function updateLesson(
  lesson: PrimerLesson,
  simMode: SimNetworkMode = 'normal',
  signal?: AbortSignal
): Promise<PrimerLesson> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const res = await fetchRemoteJson<{ lesson: PrimerLesson }>(
      `/lessons/${encodeURIComponent(lesson.id)}`,
      { method: 'PUT', body: JSON.stringify(lesson) },
      signal
    );
    return res.lesson;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });
  const lessons = loadLessons();
  const updatedLesson: PrimerLesson = {
    ...lesson,
    updatedAt: getTodayKey(),
  };
  const next = lessons.map((l) => (l.id === lesson.id ? updatedLesson : l));
  saveLessons(next);
  return updatedLesson;
}

export async function togglePublishLesson(
  lessonId: string,
  simMode: SimNetworkMode = 'normal',
  signal?: AbortSignal
): Promise<PrimerLesson[]> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const res = await fetchRemoteJson<{ items: PrimerLesson[] }>(
      `/lessons/${encodeURIComponent(lessonId)}/publish`,
      { method: 'PATCH' },
      signal
    );
    return res.items;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });
  const lessons = loadLessons();
  const next = lessons.map((l) =>
    l.id === lessonId ? { ...l, published: !l.published, updatedAt: getTodayKey() } : l
  );
  saveLessons(next);
  return next;
}

export async function deleteLesson(
  lessonId: string,
  simMode: SimNetworkMode = 'normal',
  signal?: AbortSignal
): Promise<PrimerLesson[]> {
  if (await shouldUseRemote(simMode)) {
    await simulateNetwork(simMode, { signal, isMutation: true, skipDelayIfRemote: true });
    const res = await fetchRemoteJson<{ items: PrimerLesson[] }>(
      `/lessons/${encodeURIComponent(lessonId)}`,
      { method: 'DELETE' },
      signal
    );
    return res.items;
  }

  await simulateNetwork(simMode, { signal, isMutation: true });
  const lessons = loadLessons().filter((l) => l.id !== lessonId);
  saveLessons(lessons);
  return lessons;
}

export function resetDemoData(): void {
  Object.values(KEYS).forEach((k) => removeStorage(k));
  saveLessons(SEED_LESSONS);
  saveChildren(createSeedChildren());
  saveDevice(SEED_DEVICE);

  if (isBrowserEnv()) {
    isRemoteApiAvailable()
      .then((ok) => {
        if (!ok) return;
        return fetch('/api/demo/reset', { method: 'POST' });
      })
      .catch(() => {
        // Ignore background reset error
      });
  }
}
