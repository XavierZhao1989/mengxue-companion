import React, { useState } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  LayoutDashboard,
  RotateCcw,
  Check,
  ChevronRight,
} from 'lucide-react';
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
  fetchLessons,
  resetDemoData,
  switchActiveChild,
  toggleDeviceConnection,
} from '../services/api';
import type { SimNetworkMode } from '../types/domain';
import { getLast7Days } from '../utils/date';

interface ProfilePageProps {
  simMode: SimNetworkMode;
  dataVersion: number;
  onOpenReader: (lessonId: string) => void;
  onEnterAdmin: () => void;
  onShowToast: (msg: string, variant?: ToastVariant) => void;
  onDataMutated: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  simMode,
  dataVersion,
  onOpenReader,
  onEnterAdmin,
  onShowToast,
  onDataMutated,
}) => {
  const [togglingDevice, setTogglingDevice] = useState(false);

  const { status, data, error, isSlow, fromCache, retry } = useAsyncData(
    async (signal) => {
      const [dash, lessons] = await Promise.all([
        fetchDashboard(simMode, signal),
        fetchLessons({ includeUnpublished: false }, simMode, signal),
      ]);
      return { dash, lessons: lessons.items };
    },
    {
      deps: [simMode, dataVersion],
      isEmpty: (res) => res.dash.allChildren.length === 0,
    }
  );

  if (status === 'loading') {
    return <HomeSkeleton isSlow={isSlow} />;
  }

  if (status === 'error') {
    return <ErrorState error={error} onRetry={retry} />;
  }

  if (status === 'empty' || !data) {
    return (
      <EmptyState
        title="还没有伴学档案"
        description="点击下方恢复示例数据，立即体验完整的亲子伴读档案。"
        actionLabel="恢复默认示例"
        onAction={() => {
          resetDemoData();
          onDataMutated();
        }}
      />
    );
  }

  const { activeChild, allChildren, device } = data.dash;
  const completedLessons = data.lessons.filter((l) =>
    activeChild.completedLessonIds.includes(l.id)
  );
  const weekDays = getLast7Days(activeChild.checkInDates);

  const handleToggleDevice = async () => {
    if (togglingDevice) return;
    setTogglingDevice(true);
    try {
      const updated = await toggleDeviceConnection(simMode);
      onShowToast(
        updated.connected ? `已重连 ${updated.name}` : `已断开 ${updated.name}`,
        updated.connected ? 'success' : 'info'
      );
      onDataMutated();
    } catch (err) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : '操作失败';
      onShowToast(msg, 'error');
    } finally {
      setTogglingDevice(false);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fromCache && <OfflineBanner />}

      {/* Child Profile Card */}
      <section
        data-spec-pad="18px"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 18,
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--brand-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {activeChild.avatarEmoji}
            </div>
            <div>
              <div className="t-h1" style={{ fontSize: 18 }}>
                {activeChild.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeChild.ageLabel}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {allChildren.map((child) => {
              const active = child.id === activeChild.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={async () => {
                    if (active) return;
                    await switchActiveChild(child.id, simMode);
                    onDataMutated();
                  }}
                  className="pressable"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 12,
                    fontWeight: 600,
                    background: active ? 'var(--text-primary)' : 'var(--bg-surface-warm)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {child.name}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            background: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-primary)' }}>
              {activeChild.streakDays}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>连续伴读(天)</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeChild.totalMinutes}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>累计分钟</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-jade)' }}>
              {completedLessons.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>已读经典</div>
          </div>
        </div>

        {/* 7-day dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 2 }}>
          {weekDays.map((d) => (
            <div
              key={d.dateKey}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.weekdayLabel}</span>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: d.checked ? 'var(--brand-jade)' : 'var(--bg-surface-warm)',
                  color: d.checked ? '#FFFFFF' : 'var(--text-muted)',
                  fontSize: 11,
                }}
              >
                {d.checked ? <Check size={12} /> : d.dayNumber}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Hardware Device Card */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: device.connected ? 'var(--brand-jade-soft)' : 'var(--bg-surface-warm)',
              color: device.connected ? 'var(--brand-jade)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {device.connected ? <Bluetooth size={19} /> : <BluetoothOff size={19} />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{device.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {device.connected
                ? `电量 ${device.battery}% · ${device.lastSyncedAt}`
                : '蓝牙未连接 · 仅手机领读'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleDevice}
          disabled={togglingDevice}
          className="pressable"
          style={{
            minHeight: 34,
            padding: '0 12px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-surface-warm)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {device.connected ? '断开' : '连接'}
        </button>
      </section>

      {/* Mastered Lessons */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 className="t-h2" style={{ margin: 0 }}>
          已学过的好篇目
        </h3>
        {completedLessons.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              fontSize: 13,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            完成第一篇 5 分钟伴读后，这里会记下宝贝的成长足迹。
          </div>
        ) : (
          completedLessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onOpenReader(lesson.id)}
              className="pressable"
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
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{lesson.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lesson.author}</div>
              </div>
              <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))
        )}
      </section>

      {/* Admin Entry & Reset */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <button
          type="button"
          onClick={onEnterAdmin}
          className="pressable"
          data-spec-touch="管理后台入口"
          style={{
            height: 46,
            borderRadius: 'var(--radius-md)',
            background: 'var(--text-primary)',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LayoutDashboard size={17} />
          <span>切换至运营管理后台 (PC视图)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            resetDemoData();
            onDataMutated();
            onShowToast('已恢复默认演示数据', 'success');
          }}
          className="pressable"
          style={{
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={14} />
          <span>重置演示数据（清空本地打卡进度）</span>
        </button>
      </div>
    </div>
  );
};
