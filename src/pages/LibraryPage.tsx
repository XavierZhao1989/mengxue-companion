import React, { useEffect, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  LibrarySkeleton,
  OfflineBanner,
} from '../components/mobile/StateViews';
import type { ToastVariant } from '../components/mobile/Toast';
import { useAsyncData } from '../hooks/useAsyncData';
import { fetchLessons, setTodayLesson } from '../services/api';
import {
  CATEGORY_LABELS,
  type AgeGroup,
  type Category,
  type SimNetworkMode,
} from '../types/domain';

interface LibraryPageProps {
  simMode: SimNetworkMode;
  dataVersion: number;
  todayLessonId: string;
  onOpenReader: (lessonId: string) => void;
  onShowToast: (msg: string, variant?: ToastVariant) => void;
  onDataMutated: () => void;
}

const CATEGORIES: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'mengxue', label: CATEGORY_LABELS.mengxue },
  { id: 'poetry', label: CATEGORY_LABELS.poetry },
  { id: 'shenglv', label: CATEGORY_LABELS.shenglv },
];

const AGE_GROUPS: Array<{ id: AgeGroup | 'all'; label: string }> = [
  { id: 'all', label: '全部年龄' },
  { id: '3-4', label: '3-4岁' },
  { id: '5-6', label: '5-6岁' },
  { id: '7-8', label: '7-8岁' },
];

export const LibraryPage: React.FC<LibraryPageProps> = ({
  simMode,
  dataVersion,
  todayLessonId,
  onOpenReader,
  onShowToast,
  onDataMutated,
}) => {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | 'all'>('all');
  const [inputKeyword, setInputKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [optimisticTodayId, setOptimisticTodayId] = useState<string | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(inputKeyword);
    }, 280);
    return () => clearTimeout(timer);
  }, [inputKeyword]);

  const { status, data, error, isSlow, fromCache, retry } = useAsyncData(
    (signal) =>
      fetchLessons(
        {
          category,
          ageGroup,
          keyword: debouncedKeyword,
          includeUnpublished: false,
        },
        simMode,
        signal
      ),
    {
      deps: [category, ageGroup, debouncedKeyword, simMode, dataVersion],
      isEmpty: (res) => res.items.length === 0,
    }
  );

  const effectiveTodayId = optimisticTodayId ?? todayLessonId;
  const hasFilters = category !== 'all' || ageGroup !== 'all' || inputKeyword.trim() !== '';

  const handleSetToday = async (lessonId: string, title: string) => {
    if (settingId) return;
    setSettingId(lessonId);
    setOptimisticTodayId(lessonId);
    try {
      await setTodayLesson(lessonId, simMode);
      onShowToast(`已将《${title}》设为今日伴读`, 'success');
      onDataMutated();
    } catch (err) {
      setOptimisticTodayId(null);
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : '设置失败，已恢复原安排';
      onShowToast(msg, 'error');
    } finally {
      setSettingId(null);
    }
  };

  const resetFilters = () => {
    setCategory('all');
    setAgeGroup('all');
    setInputKeyword('');
    setDebouncedKeyword('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Filter Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(250, 247, 242, 0.96)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            padding: '0 12px',
            height: 42,
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            placeholder="搜篇名或关键词，如：三字经、月亮"
            aria-label="搜索蒙学篇目"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 14,
              color: 'var(--text-primary)',
              width: '100%',
            }}
          />
          {inputKeyword && (
            <button
              type="button"
              onClick={() => setInputKeyword('')}
              aria-label="清空搜索"
              className="pressable"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--bg-surface-warm)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className="pressable"
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  border: active ? '1px solid transparent' : '1px solid var(--border-subtle)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Age Group Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AGE_GROUPS.map((item) => {
            const active = ageGroup === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAgeGroup(item.id)}
                className="pressable"
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  background: active ? 'var(--brand-primary-soft)' : 'transparent',
                  color: active ? 'var(--brand-primary)' : 'var(--text-muted)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {status === 'loading' && <LibrarySkeleton isSlow={isSlow} />}

      {status === 'error' && <ErrorState error={error} onRetry={retry} />}

      {status === 'empty' && (
        <EmptyState
          title={hasFilters ? '没有找到匹配的篇目' : '蒙学馆暂时还是空的'}
          description={
            hasFilters
              ? '试试切换年龄段或清空搜索关键词，看看其他经典启蒙读物。'
              : '管理员正在整理上架新篇目，请稍后再来看看。'
          }
          actionLabel={hasFilters ? '清空筛选条件' : undefined}
          onAction={hasFilters ? resetFilters : undefined}
        />
      )}

      {status === 'success' && data && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fromCache && <OfflineBanner />}

          {data.items.map((lesson) => {
            const isToday = lesson.id === effectiveTodayId;
            return (
              <article
                key={lesson.id}
                data-spec-pad="16px"
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  onClick={() => onOpenReader(lesson.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <h3
                      className="t-h2 line-clamp-1"
                      data-spec-type="H2 17/24"
                      style={{ margin: 0, color: 'var(--text-primary)' }}
                    >
                      {lesson.title}
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {lesson.durationMinutes} 分钟
                    </span>
                  </div>

                  <p
                    className="line-clamp-2"
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      lineHeight: '20px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {lesson.summary}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 4,
                    borderTop: '1px solid var(--bg-surface-warm)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: 'var(--bg-surface-warm)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {CATEGORY_LABELS[lesson.category]}
                    </span>
                    {lesson.ageGroups.map((age) => (
                      <span
                        key={age}
                        style={{
                          fontSize: 11,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'var(--bg-canvas)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {age}岁
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isToday || settingId === lesson.id}
                    onClick={() => handleSetToday(lesson.id, lesson.title)}
                    className="pressable"
                    data-spec-touch="设为今日 ≥34pt"
                    style={{
                      minHeight: 34,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)',
                      background: isToday ? 'var(--brand-jade-soft)' : 'var(--brand-primary-soft)',
                      color: isToday ? 'var(--brand-jade)' : 'var(--brand-primary)',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                      opacity: 1,
                    }}
                  >
                    {isToday ? <Check size={13} /> : <Plus size={13} />}
                    <span>{isToday ? '今日伴读' : '设为今日'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
