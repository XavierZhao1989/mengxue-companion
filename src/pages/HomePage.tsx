import React, { useState } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Play,
  Sparkles,
} from 'lucide-react';
import { BottomSheet } from '../components/mobile/BottomSheet';
import {
  EmptyState,
  ErrorState,
  HomeSkeleton,
  OfflineBanner,
} from '../components/mobile/StateViews';
import type { ToastVariant } from '../components/mobile/Toast';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  fetchDashboard,
  switchActiveChild,
  toggleDeviceConnection,
} from '../services/api';
import {
  CATEGORY_LABELS,
  type ChildProfile,
  type SimNetworkMode,
} from '../types/domain';
import { getLast7Days, getTodayKey } from '../utils/date';

interface HomePageProps {
  simMode: SimNetworkMode;
  dataVersion: number;
  onStartReader: (lessonId: string) => void;
  onGoLibrary: () => void;
  onShowToast: (msg: string, variant?: ToastVariant) => void;
  onDataMutated: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  simMode,
  dataVersion,
  onStartReader,
  onGoLibrary,
  onShowToast,
  onDataMutated,
}) => {
  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);
  const [switchingChild, setSwitchingChild] = useState(false);
  const [togglingDevice, setTogglingDevice] = useState(false);

  const { status, data, error, isSlow, fromCache, retry } = useAsyncData(
    (signal) => fetchDashboard(simMode, signal),
    {
      deps: [simMode, dataVersion],
      isEmpty: (payload) => !payload.todayLesson && payload.planLessons.length === 0,
    }
  );

  const handleSwitchChild = async (child: ChildProfile) => {
    if (!data || child.id === data.activeChild.id || switchingChild) return;
    setSwitchingChild(true);
    try {
      await switchActiveChild(child.id, simMode);
      onShowToast(`已切换为「${child.name}」的伴读计划`, 'info');
      onDataMutated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '切换失败，请重试';
      onShowToast(msg, 'error');
    } finally {
      setSwitchingChild(false);
    }
  };

  const handleToggleDevice = async () => {
    if (togglingDevice) return;
    setTogglingDevice(true);
    try {
      const updated = await toggleDeviceConnection(simMode);
      onShowToast(
        updated.connected ? `已连接 ${updated.name}` : `已断开 ${updated.name}`,
        updated.connected ? 'success' : 'info'
      );
      onDataMutated();
    } catch (err) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : '蓝牙状态切换失败';
      onShowToast(msg, 'error');
    } finally {
      setTogglingDevice(false);
    }
  };

  if (status === 'loading') {
    return <HomeSkeleton isSlow={isSlow} />;
  }

  if (status === 'error') {
    return <ErrorState error={error} onRetry={retry} />;
  }

  if (status === 'empty' || !data) {
    return (
      <EmptyState
        title="今天还没有安排伴读篇目"
        description="去蒙学馆挑一篇适合孩子年龄的经典吧，每天只需 5 分钟。"
        actionLabel="去蒙学馆挑一篇"
        onAction={onGoLibrary}
      />
    );
  }

  const { activeChild, allChildren, todayLesson, todayProgress, planLessons, device } = data;
  const todayChecked = activeChild.checkInDates.includes(getTodayKey());
  const weekDays = getLast7Days(activeChild.checkInDates);
  const hasResume =
    Boolean(todayLesson) &&
    Boolean(todayProgress) &&
    (todayProgress?.lineIndex ?? 0) > 0 &&
    !todayChecked;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fromCache && <OfflineBanner />}

      {/* Top Row: Child Switcher + Hardware Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {allChildren.map((child) => {
            const active = child.id === activeChild.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSwitchChild(child)}
                disabled={switchingChild}
                className="pressable"
                data-spec-touch={active ? '切换孩子 ≥36pt' : undefined}
                style={{
                  minHeight: 36,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  background: active ? 'var(--text-primary)' : 'var(--bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  border: active ? '1px solid transparent' : '1px solid var(--border-subtle)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{child.avatarEmoji}</span>
                <span>{child.name}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setDeviceSheetOpen(true)}
          className="pressable"
          data-spec-touch="硬件状态胶囊"
          style={{
            minHeight: 34,
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            background: device.connected ? 'var(--brand-jade-soft)' : 'var(--bg-surface-warm)',
            color: device.connected ? 'var(--brand-jade)' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {device.connected ? <Bluetooth size={13} /> : <BluetoothOff size={13} />}
          <span>{device.connected ? `伴读笔 ${device.battery}%` : '伴读笔未连'}</span>
        </button>
      </div>

      {/* Hero Today's Primer Card */}
      {todayLesson && (
        <section
          aria-label="今日伴读主任务"
          data-spec-pad="20px"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              style={{
                background: todayChecked ? 'var(--brand-jade-soft)' : 'var(--brand-primary-soft)',
                color: todayChecked ? 'var(--brand-jade)' : 'var(--brand-primary)',
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {todayChecked ? <Check size={13} /> : <Sparkles size={13} />}
              <span>{todayChecked ? '今日已完成打卡' : '今日睡前推荐'}</span>
            </span>

            <span
              className="t-caption"
              style={{
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Clock size={13} />
              <span>约 {todayLesson.durationMinutes} 分钟</span>
            </span>
          </div>

          <div>
            <h2
              className="t-display"
              data-spec-type="Display 24/32"
              style={{ margin: 0, color: 'var(--text-primary)' }}
            >
              {todayLesson.title}
            </h2>
            <p
              className="t-body line-clamp-2"
              data-spec-type="Body 15/24"
              style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}
            >
              {todayLesson.summary}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface-warm)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {CATEGORY_LABELS[todayLesson.category]}
            </span>
            {todayLesson.ageGroups.map((age) => (
              <span
                key={age}
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-surface-warm)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                {age}岁
              </span>
            ))}
            {hasResume && todayProgress && (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--brand-primary)',
                  fontWeight: 600,
                }}
              >
                · 上次读到第 {todayProgress.lineIndex + 1}/{todayLesson.lines.length} 句
              </span>
            )}
          </div>

          {/* Parent Tip Teaser */}
          <div
            style={{
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontSize: 13,
              lineHeight: '20px',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>伴读小贴士：</strong>
            {todayLesson.parentGuide}
          </div>

          {/* Primary Single-Hand Thumb CTA */}
          <button
            type="button"
            onClick={() => onStartReader(todayLesson.id)}
            className="pressable"
            data-spec-touch="主CTA 52pt"
            style={{
              height: 52,
              width: '100%',
              borderRadius: 'var(--radius-md)',
              background: todayChecked ? 'var(--brand-jade)' : 'var(--brand-primary)',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: todayChecked
                ? '0 6px 16px rgba(47, 125, 99, 0.25)'
                : '0 6px 16px rgba(200, 90, 50, 0.28)',
            }}
          >
            <Play size={18} fill="currentColor" />
            <span>
              {todayChecked
                ? '已打卡 · 再陪孩子读一遍'
                : hasResume
                  ? '继续今日伴读'
                  : `开始 ${todayLesson.durationMinutes} 分钟伴读`}
            </span>
          </button>
        </section>
      )}

      {/* 7-Day Rhythm Card */}
      <section
        aria-label="本周伴读节奏"
        data-spec-pad="16px"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span className="t-h2" style={{ fontSize: 15 }}>
            7 日伴读足迹
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--brand-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Flame size={15} />
            <span>已连续 {activeChild.streakDays} 天</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {weekDays.map((day) => (
            <div
              key={day.dateKey}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: day.isToday ? 'var(--brand-primary)' : 'var(--text-muted)',
                  fontWeight: day.isToday ? 600 : 400,
                }}
              >
                {day.weekdayLabel}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  background: day.checked
                    ? 'var(--brand-jade)'
                    : day.isToday
                      ? 'var(--brand-primary-soft)'
                      : 'var(--bg-surface-warm)',
                  color: day.checked
                    ? '#FFFFFF'
                    : day.isToday
                      ? 'var(--brand-primary)'
                      : 'var(--text-muted)',
                  border:
                    day.isToday && !day.checked
                      ? '1.5px dashed var(--brand-primary)'
                      : 'none',
                }}
              >
                {day.checked ? <Check size={14} /> : day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plan Queue */}
      <section aria-label="本周伴读清单" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="t-h2" data-spec-type="H2 17/24" style={{ margin: 0 }}>
            近期伴读清单
          </h3>
          <button
            type="button"
            onClick={onGoLibrary}
            className="pressable"
            style={{
              fontSize: 13,
              color: 'var(--brand-primary)',
              fontWeight: 500,
              minHeight: 36,
              padding: '0 4px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span>去选更多</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {planLessons.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              border: '1px dashed var(--border-strong)',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            清单暂时空着，去「蒙学馆」把喜欢的篇目加入伴读计划吧。
          </div>
        ) : (
          planLessons.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStartReader(item.id)}
              className="pressable"
              data-spec-touch="列表项 ≥56pt"
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  className="line-clamp-1"
                  style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  {item.title}
                </div>
                <div
                  className="line-clamp-1"
                  style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}
                >
                  {item.subtitle} · {item.lines.length} 句
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))
        )}
      </section>

      {/* Hardware Companion Bottom Sheet */}
      <BottomSheet
        open={deviceSheetOpen}
        title="智能硬件伴读笔状态"
        onClose={() => setDeviceSheetOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{device.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                型号 {device.model} · 固件 {device.firmware}
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                background: device.connected ? 'var(--brand-jade-soft)' : 'var(--bg-surface-warm)',
                color: device.connected ? 'var(--brand-jade)' : 'var(--text-secondary)',
              }}
            >
              {device.connected ? `已连接 · ${device.battery}%` : '未连接'}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: '20px' }}>
            {device.connected
              ? '点读笔已同步今日《' + (todayLesson?.title ?? '蒙学') + '》音频包，孩子点触纸质绘本即可同步跟读。'
              : '未连接硬件时，可直接使用手机外放领读模式，不影响每日伴读打卡。'}
          </p>

          <button
            type="button"
            onClick={handleToggleDevice}
            disabled={togglingDevice}
            className="pressable touch-target"
            style={{
              height: 46,
              borderRadius: 'var(--radius-md)',
              background: device.connected ? 'var(--bg-surface-warm)' : 'var(--brand-primary)',
              color: device.connected ? 'var(--text-primary)' : '#FFFFFF',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {togglingDevice
              ? '同步中…'
              : device.connected
                ? '模拟断开蓝牙连接'
                : '重新连接伴读笔'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
