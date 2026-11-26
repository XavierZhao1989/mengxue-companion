import React from 'react';
import { ChevronLeft, Wifi, Battery } from 'lucide-react';
import type { SimDeviceMode } from '../../types/domain';

interface MobileHeaderProps {
  title: string;
  deviceMode: SimDeviceMode;
  showFrameChrome: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  deviceMode,
  showFrameChrome,
  onBack,
  rightSlot,
}) => {
  const isMiniProgram = deviceMode === 'miniprogram';
  const safeLabel = deviceMode === 'iphonese' ? '20px' : '48px';

  return (
    <header
      style={{
        flexShrink: 0,
        background: 'rgba(250, 247, 242, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Safe Area Top + Optional Simulated Device Status Bar */}
      <div
        className="spec-safe-top"
        data-safe-label={safeLabel}
        style={{
          height: 'var(--safe-top)',
          padding: deviceMode === 'iphonese' ? '2px 14px 0' : '12px 22px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {showFrameChrome && (
          <>
            <span>20:53</span>
            {deviceMode !== 'iphonese' && (
              <div
                aria-hidden="true"
                style={{
                  width: 96,
                  height: 24,
                  borderRadius: 99,
                  background: '#111111',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Wifi size={13} />
              <Battery size={15} />
            </div>
          </>
        )}
      </div>

      {/* Navigation Bar */}
      <div
        style={{
          height: 'var(--header-height)',
          paddingLeft: onBack ? 4 : 16,
          paddingRight: isMiniProgram ? 104 : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="返回上一页"
              className="touch-target pressable"
              data-spec-touch="返回 44×44pt"
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-pill)',
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <h1
            className="t-h1 line-clamp-1"
            data-spec-type="H1 20/28"
            style={{ margin: 0, color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
        </div>

        {rightSlot && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {rightSlot}
          </div>
        )}

        {/* Authentic WeChat Mini Program Capsule */}
        {isMiniProgram && (
          <div
            className="mp-capsule-zone"
            title="微信小程序右上角原生胶囊避让区"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 84,
              height: 30,
              borderRadius: 99,
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(44, 38, 33, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-evenly',
              padding: '0 6px',
            }}
          >
            <span style={{ fontSize: 12, letterSpacing: 1, fontWeight: 700, color: '#2C2621' }}>
              •••
            </span>
            <span style={{ width: 1, height: 14, background: 'rgba(44,38,33,0.16)' }} />
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '1.5px solid #2C2621',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#2C2621',
                }}
              />
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
