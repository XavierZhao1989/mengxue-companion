import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        background: 'rgba(24, 20, 17, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="anim-sheet-rise"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          padding: '12px 20px calc(20px + var(--safe-bottom))',
          boxShadow: 'var(--shadow-elevated)',
          maxHeight: '82%',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 99,
            background: 'var(--border-strong)',
            margin: '0 auto 12px',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h3 className="t-h2" style={{ margin: 0, color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="touch-target pressable"
            data-spec-touch="44×44pt"
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-pill)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
