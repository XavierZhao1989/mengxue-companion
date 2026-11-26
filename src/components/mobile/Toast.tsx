import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export const ToastContainer: React.FC<{ items: ToastItem[] }> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(var(--safe-top) + 56px)',
        left: 16,
        right: 16,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
      aria-live="polite"
    >
      {items.map((item) => {
        const bg =
          item.variant === 'error'
            ? '#CF3F38'
            : item.variant === 'success'
              ? '#2F7D63'
              : '#2C2621';
        const Icon =
          item.variant === 'error'
            ? AlertCircle
            : item.variant === 'success'
              ? CheckCircle2
              : Info;

        return (
          <div
            key={item.id}
            className="anim-fade-up"
            style={{
              background: bg,
              color: '#FFFFFF',
              borderRadius: 'var(--radius-pill)',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-elevated)',
              alignSelf: 'center',
              maxWidth: '100%',
            }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            <span>{item.message}</span>
          </div>
        );
      })}
    </div>
  );
};
