import React from 'react';
import { RefreshCw, WifiOff, Clock, BookOpen } from 'lucide-react';
import type { ApiError } from '../../types/domain';

export const OfflineBanner: React.FC = () => (
  <div
    role="status"
    style={{
      background: 'var(--brand-amber-soft)',
      border: '1px solid rgba(201, 122, 0, 0.25)',
      color: '#7A4B00',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    }}
  >
    <WifiOff size={15} style={{ flexShrink: 0 }} />
    <span>当前处于离线缓存模式，可继续阅读已缓存篇目；联网后自动同步打卡。</span>
  </div>
);

export const SlowNetworkHint: React.FC = () => (
  <div
    role="status"
    className="anim-fade-up"
    style={{
      background: 'var(--brand-primary-soft)',
      color: 'var(--brand-primary)',
      borderRadius: 'var(--radius-pill)',
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      margin: '0 auto 12px',
    }}
  >
    <Clock size={14} />
    <span>网络有点慢，正在为您努力加载…</span>
  </div>
);

export const HomeSkeleton: React.FC<{ isSlow?: boolean }> = ({ isSlow }) => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {isSlow && <SlowNetworkHint />}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="skeleton-box" style={{ width: 128, height: 34, borderRadius: 99 }} />
      <div className="skeleton-box" style={{ width: 112, height: 30, borderRadius: 99 }} />
    </div>
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div className="skeleton-box" style={{ width: 88, height: 22 }} />
      <div className="skeleton-box" style={{ width: '75%', height: 28 }} />
      <div className="skeleton-box" style={{ width: '100%', height: 40 }} />
      <div className="skeleton-box" style={{ width: '100%', height: 50, borderRadius: 14 }} />
    </div>
    <div className="skeleton-box" style={{ width: '100%', height: 84, borderRadius: 14 }} />
    <div className="skeleton-box" style={{ width: '100%', height: 112, borderRadius: 14 }} />
  </div>
);

export const LibrarySkeleton: React.FC<{ isSlow?: boolean }> = ({ isSlow }) => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {isSlow && <SlowNetworkHint />}
    <div className="skeleton-box" style={{ width: '100%', height: 42, borderRadius: 99 }} />
    <div style={{ display: 'flex', gap: 8 }}>
      <div className="skeleton-box" style={{ width: 72, height: 32, borderRadius: 99 }} />
      <div className="skeleton-box" style={{ width: 84, height: 32, borderRadius: 99 }} />
      <div className="skeleton-box" style={{ width: 84, height: 32, borderRadius: 99 }} />
    </div>
    {[1, 2, 3].map((k) => (
      <div
        key={k}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div className="skeleton-box" style={{ width: '55%', height: 22 }} />
        <div className="skeleton-box" style={{ width: '90%', height: 16 }} />
        <div className="skeleton-box" style={{ width: '40%', height: 28, borderRadius: 99 }} />
      </div>
    ))}
  </div>
);

export const ReaderSkeleton: React.FC<{ isSlow?: boolean }> = ({ isSlow }) => (
  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {isSlow && <SlowNetworkHint />}
    <div className="skeleton-box" style={{ width: '100%', height: 6, borderRadius: 99 }} />
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div className="skeleton-box" style={{ width: '80%', height: 56 }} />
      <div className="skeleton-box" style={{ width: '90%', height: 20 }} />
      <div className="skeleton-box" style={{ width: '70%', height: 20 }} />
    </div>
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div
    className="anim-fade-up"
    style={{
      padding: '40px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'var(--bg-surface-warm)',
        color: 'var(--brand-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BookOpen size={30} />
    </div>
    <h3 className="t-h2" style={{ margin: 0, color: 'var(--text-primary)' }}>
      {title}
    </h3>
    <p
      className="t-body"
      style={{
        margin: 0,
        color: 'var(--text-secondary)',
        maxWidth: 260,
        fontSize: 14,
      }}
    >
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="pressable touch-target"
        data-spec-touch="CTA ≥44pt"
        style={{
          marginTop: 4,
          background: 'var(--brand-primary)',
          color: '#FFFFFF',
          padding: '10px 22px',
          borderRadius: 'var(--radius-pill)',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

interface ErrorStateProps {
  error: ApiError | null;
  onRetry: () => void;
  retrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  retrying = false,
}) => (
  <div
    role="alert"
    className="anim-fade-up"
    style={{
      padding: '40px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}
  >
    <div
      style={{
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: 'var(--brand-danger-soft)',
        color: 'var(--brand-danger)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      !
    </div>
    <h3 className="t-h2" style={{ margin: 0, color: 'var(--text-primary)' }}>
      加载遇到一点小状况
    </h3>
    <p
      className="t-body"
      style={{
        margin: 0,
        color: 'var(--text-secondary)',
        maxWidth: 270,
        fontSize: 14,
      }}
    >
      {error?.message ?? '网络暂时不稳定，请点击下方按钮重试。'}
    </p>
    {error?.code && (
      <code
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--bg-surface-warm)',
          padding: '2px 8px',
          borderRadius: 6,
        }}
      >
        错误码：{error.code}
      </code>
    )}
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="pressable touch-target"
      data-spec-touch="重试 ≥44pt"
      style={{
        marginTop: 4,
        background: 'var(--brand-primary)',
        color: '#FFFFFF',
        padding: '10px 22px',
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontSize: 14,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <RefreshCw size={15} />
      <span>{retrying ? '重试中…' : '重新加载'}</span>
    </button>
  </div>
);
