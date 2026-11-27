import Taro from '@tarojs/taro';

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

// Configure CLOUD_ENV_ID + CLOUD_SERVICE_NAME when deploying via WeChat CloudRun (zero ICP filing).
// Leave CLOUD_ENV_ID empty to call the public Vercel HTTPS API directly in DevTools/Experience mode.
export const CLOUD_ENV_ID = process.env.TARO_APP_CLOUD_ENV_ID || '';
export const CLOUD_SERVICE_NAME = process.env.TARO_APP_CLOUD_SERVICE_NAME || 'mengxue-api';
export const API_BASE_URL = 'https://mengxue-companion.vercel.app/api';

const CACHE_PREFIX = 'mx_mp_cache_';

function readCache<T>(key: string): T | null {
  try {
    const raw = Taro.getStorageSync(`${CACHE_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    Taro.setStorageSync(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

async function requestApi<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; data?: unknown } = {}
): Promise<T> {
  const { method = 'GET', data } = options;

  if (CLOUD_ENV_ID && typeof wx !== 'undefined' && wx.cloud) {
    const res = await wx.cloud.callContainer({
      config: { env: CLOUD_ENV_ID },
      path: `/api${path}`,
      header: {
        'X-WX-SERVICE': CLOUD_SERVICE_NAME,
        'content-type': 'application/json',
      },
      method,
      data,
    });
    if (res.statusCode >= 400) {
      throw new Error((res.data as { message?: string })?.message ?? '服务请求失败');
    }
    return res.data as T;
  }

  const res = await Taro.request<T & { message?: string }>({
    url: `${API_BASE_URL}${path}`,
    method,
    data,
    header: { 'content-type': 'application/json' },
    timeout: 8000,
  });

  if (res.statusCode >= 400) {
    throw new Error(res.data?.message ?? `请求失败 (${res.statusCode})`);
  }
  return res.data;
}

export async function fetchDashboardMp(): Promise<DashboardPayload> {
  try {
    const data = await requestApi<DashboardPayload>('/dashboard');
    writeCache('dashboard', data);
    return data;
  } catch (err) {
    const cached = readCache<DashboardPayload>('dashboard');
    if (cached) {
      return { ...cached, fromCache: true };
    }
    throw err;
  }
}

export async function switchChildMp(childId: string): Promise<void> {
  await requestApi(`/children/${encodeURIComponent(childId)}/activate`, { method: 'POST' });
}

export async function fetchLessonsMp(query: {
  category?: string;
  ageGroup?: string;
  keyword?: string;
}): Promise<{ items: PrimerLesson[]; fromCache?: boolean }> {
  const qs = [
    query.category ? `category=${encodeURIComponent(query.category)}` : '',
    query.ageGroup ? `ageGroup=${encodeURIComponent(query.ageGroup)}` : '',
    query.keyword ? `keyword=${encodeURIComponent(query.keyword)}` : '',
  ]
    .filter(Boolean)
    .join('&');

  try {
    const res = await requestApi<{ items: PrimerLesson[] }>(`/lessons${qs ? `?${qs}` : ''}`);
    if (!qs) writeCache('lessons', res);
    return res;
  } catch (err) {
    const cached = readCache<{ items: PrimerLesson[] }>('lessons');
    if (cached && !qs) {
      return { ...cached, fromCache: true };
    }
    throw err;
  }
}

export async function fetchLessonDetailMp(
  lessonId: string,
  childId?: string
): Promise<{
  lesson: PrimerLesson | null;
  progress: { lineIndex: number } | null;
}> {
  const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
  return requestApi(`/lessons/${encodeURIComponent(lessonId)}${qs}`);
}

export async function saveProgressMp(
  childId: string,
  lessonId: string,
  lineIndex: number
): Promise<void> {
  await requestApi('/progress', {
    method: 'PUT',
    data: { childId, lessonId, lineIndex },
  });
}

export async function completeCheckInMp(
  childId: string,
  lessonId: string,
  durationMinutes: number
): Promise<{ child: ChildProfile; alreadyCheckedToday: boolean }> {
  return requestApi('/checkins', {
    method: 'POST',
    data: { childId, lessonId, durationMinutes },
  });
}

export async function setTodayLessonMp(childId: string, lessonId: string): Promise<void> {
  await requestApi(`/children/${encodeURIComponent(childId)}/today-lesson`, {
    method: 'POST',
    data: { lessonId },
  });
}
