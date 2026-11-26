export type AgeGroup = '3-4' | '5-6' | '7-8';

export type Category = 'mengxue' | 'poetry' | 'shenglv';

export interface CharNote {
  char: string;
  pinyin: string;
  meaning: string;
  parentQuestion: string;
}

export interface VerseLine {
  id: string;
  text: string;
  pinyin: string[];
  vernacular: string;
  parentTip: string;
}

export interface PrimerLesson {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  category: Category;
  ageGroups: AgeGroup[];
  durationMinutes: number;
  summary: string;
  parentGuide: string;
  published: boolean;
  lines: VerseLine[];
  charNotes: CharNote[];
  updatedAt: string;
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

export interface HardwareDevice {
  id: string;
  name: string;
  model: string;
  connected: boolean;
  battery: number;
  firmware: string;
  lastSyncedAt: string;
}

export interface ReadingProgress {
  lessonId: string;
  childId: string;
  lineIndex: number;
  updatedAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}

export type AsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: ApiError | null;
  isSlow: boolean;
  fromCache: boolean;
}

export type SimNetworkMode =
  | 'normal'
  | 'loading'
  | 'slow'
  | 'empty'
  | 'error'
  | 'offline';

export type SimDeviceMode =
  | 'iphone15'
  | 'iphonese'
  | 'miniprogram'
  | 'admin';

export type MainTab = 'home' | 'library' | 'profile';

export interface AppRoute {
  tab: MainTab;
  readerLessonId?: string;
  returnTab?: MainTab;
}

export interface DashboardPayload {
  activeChild: ChildProfile;
  allChildren: ChildProfile[];
  todayLesson: PrimerLesson | null;
  todayProgress: ReadingProgress | null;
  planLessons: PrimerLesson[];
  device: HardwareDevice;
  fromCache: boolean;
}

export interface LessonsQuery {
  category?: Category | 'all';
  ageGroup?: AgeGroup | 'all';
  keyword?: string;
  includeUnpublished?: boolean;
}

export interface LessonsPayload {
  items: PrimerLesson[];
  totalCount: number;
  fromCache: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  mengxue: '蒙学经典',
  poetry: '唐诗吟诵',
  shenglv: '声律启蒙',
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '3-4': '3-4岁 启蒙',
  '5-6': '5-6岁 幼小衔接',
  '7-8': '7-8岁 熟读',
};
