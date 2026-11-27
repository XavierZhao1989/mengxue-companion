import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VerseLine {
  id: string;
  text: string;
  pinyin: string[];
  vernacular: string;
  parentTip: string;
}

export interface CharNote {
  char: string;
  pinyin: string;
  meaning: string;
  parentQuestion: string;
}

export interface PrimerLesson {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  category: 'mengxue' | 'poetry' | 'shenglv';
  ageGroups: Array<'3-4' | '5-6' | '7-8'>;
  durationMinutes: number;
  summary: string;
  parentGuide: string;
  published: boolean;
  lines: VerseLine[];
  charNotes: CharNote[];
}

export interface ChildProfile {
  id: string;
  name: string;
  ageLabel: string;
  avatarEmoji: string;
  streakDays: number;
  totalMinutes: number;
  todayLessonId: string;
  planLessonIds: string[];
  completedLessonIds: string[];
  checkInDates: string[];
}

export interface DashboardPayload {
  activeChild: ChildProfile;
  allChildren: ChildProfile[];
  todayLesson: PrimerLesson | null;
  todayProgress: { lineIndex: number } | null;
  planLessons: PrimerLesson[];
  device: { name: string; connected: boolean; battery: number };
  fromCache?: boolean;
}

export const API_BASE_URL = 'https://mengxue-companion.vercel.app/api';

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    const body = (await res.json()) as T & { message?: string };
    if (!res.ok) {
      throw new Error(body.message ?? `请求失败 (${res.status})`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDashboardRn(signal?: AbortSignal): Promise<DashboardPayload> {
  try {
    const data = await requestJson<DashboardPayload>('/dashboard', {}, signal);
    await AsyncStorage.setItem('mx_rn_dashboard', JSON.stringify(data));
    return data;
  } catch (err) {
    const cached = await AsyncStorage.getItem('mx_rn_dashboard');
    if (cached) {
      return { ...(JSON.parse(cached) as DashboardPayload), fromCache: true };
    }
    throw err;
  }
}

export async function switchChildRn(childId: string): Promise<void> {
  await requestJson(`/children/${encodeURIComponent(childId)}/activate`, { method: 'POST' });
}

export async function fetchLessonsRn(
  query: { category?: string; keyword?: string },
  signal?: AbortSignal
): Promise<{ items: PrimerLesson[]; fromCache?: boolean }> {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.keyword) params.set('keyword', query.keyword);
  const qs = params.toString();

  try {
    const res = await requestJson<{ items: PrimerLesson[] }>(
      `/lessons${qs ? `?${qs}` : ''}`,
      {},
      signal
    );
    if (!qs) {
      await AsyncStorage.setItem('mx_rn_lessons', JSON.stringify(res));
    }
    return res;
  } catch (err) {
    const cached = await AsyncStorage.getItem('mx_rn_lessons');
    if (cached && !qs) {
      return { ...(JSON.parse(cached) as { items: PrimerLesson[] }), fromCache: true };
    }
    throw err;
  }
}

export async function fetchLessonByIdRn(
  lessonId: string,
  childId?: string,
  signal?: AbortSignal
): Promise<{ lesson: PrimerLesson | null; progress: { lineIndex: number } | null }> {
  const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
  return requestJson(`/lessons/${encodeURIComponent(lessonId)}${qs}`, {}, signal);
}

export async function saveProgressRn(
  childId: string,
  lessonId: string,
  lineIndex: number
): Promise<void> {
  await requestJson('/progress', {
    method: 'PUT',
    body: JSON.stringify({ childId, lessonId, lineIndex }),
  });
}

export async function completeCheckInRn(
  childId: string,
  lessonId: string,
  durationMinutes: number
): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }> {
  return requestJson('/checkins', {
    method: 'POST',
    body: JSON.stringify({ childId, lessonId, durationMinutes }),
  });
}

export async function setTodayLessonRn(childId: string, lessonId: string): Promise<void> {
  await requestJson(`/children/${encodeURIComponent(childId)}/today-lesson`, {
    method: 'POST',
    body: JSON.stringify({ lessonId }),
  });
}
