import React, { useEffect, useState } from 'react';
import { PanelRightClose, PanelRightOpen, SlidersHorizontal, X } from 'lucide-react';
import type { SimDeviceMode, SimNetworkMode } from '../../types/domain';
import { InspectorPanel } from './InspectorPanel';

interface DemoWorkbenchProps {
  deviceMode: SimDeviceMode;
  simMode: SimNetworkMode;
  specOverlay: boolean;
  onChangeDevice: (mode: SimDeviceMode) => void;
  onChangeSimMode: (mode: SimNetworkMode) => void;
  onToggleSpecOverlay: () => void;
  onJumpStepDemo: (step: number) => void;
  children: (showFrameChrome: boolean) => React.ReactNode;
}

export const DemoWorkbench: React.FC<DemoWorkbenchProps> = ({
  deviceMode,
  simMode,
  specOverlay,
  onChangeDevice,
  onChangeSimMode,
  onToggleSpecOverlay,
  onJumpStepDemo,
  children,
}) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!isDesktop) {
    return (
      <div
        data-spec-overlay={specOverlay ? 'true' : 'false'}
        style={{
          height: '100dvh',
          width: '100%',
          background: 'var(--bg-canvas)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {children(false)}

        {/* Compact floating button on real mobile viewports */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="打开多端验收面板"
          className="pressable"
          style={{
            position: 'fixed',
            right: 12,
            bottom: 'calc(72px + var(--safe-bottom))',
            zIndex: 60,
            padding: '7px 12px',
            borderRadius: 99,
            background: 'rgba(24, 26, 31, 0.88)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <SlidersHorizontal size={13} />
          <span>验收台</span>
        </button>

        {mobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 95,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="scroll-y"
              style={{
                width: 'min(340px, 88vw)',
                height: '100%',
                background: 'var(--bg-inspector)',
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  style={{ color: '#9CA3AF', padding: 6 }}
                >
                  <X size={20} />
                </button>
              </div>
              <InspectorPanel
                deviceMode={deviceMode}
                simMode={simMode}
                specOverlay={specOverlay}
                onChangeDevice={(m) => {
                  onChangeDevice(m);
                  setMobileDrawerOpen(false);
                }}
                onChangeSimMode={onChangeSimMode}
                onToggleSpecOverlay={onToggleSpecOverlay}
                onJumpStepDemo={(s) => {
                  onJumpStepDemo(s);
                  setMobileDrawerOpen(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const isSE = deviceMode === 'iphonese';
  const frameWidth = isSE ? 375 : 393;
  const frameHeight = isSE ? 667 : 844;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 30% 20%, #262933 0%, #15171C 100%)',
        display: 'grid',
        gridTemplateColumns: inspectorCollapsed ? '1fr' : '1fr 376px',
      }}
    >
      {/* Left/Center Phone Bezel Canvas */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        {/* Top-left subtle branding + collapse toggle */}
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: 20,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 700, color: '#FFFFFF' }}>启蒙小笺</span>
          <span>·</span>
          <span>
            {deviceMode === 'iphonese'
              ? '375×667 小屏模式'
              : deviceMode === 'miniprogram'
                ? '微信小程序形态'
                : 'iPhone 15 Pro 形态'}
          </span>
        </div>

        {inspectorCollapsed && (
          <button
            type="button"
            onClick={() => setInspectorCollapsed(false)}
            className="pressable"
            style={{
              position: 'fixed',
              top: 16,
              right: 20,
              zIndex: 40,
              padding: '8px 14px',
              borderRadius: 99,
              background: 'var(--bg-inspector-card)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.14)',
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PanelRightOpen size={15} />
            <span>展开验收面板</span>
          </button>
        )}

        {/* Simulated Phone Frame */}
        <div
          data-device={deviceMode}
          data-spec-overlay={specOverlay ? 'true' : 'false'}
          style={{
            width: frameWidth,
            height: `min(${frameHeight}px, calc(100vh - 48px))`,
            borderRadius: isSE ? 28 : 44,
            background: 'var(--bg-canvas)',
            boxShadow: 'var(--shadow-device)',
            border: '8px solid #0E1014',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 240ms var(--ease-out), height 240ms var(--ease-out), border-radius 240ms var(--ease-out)',
          }}
        >
          {children(true)}
        </div>
      </div>

      {/* Right Dark Inspector Sidebar */}
      {!inspectorCollapsed && (
        <aside
          className="scroll-y"
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-inspector)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => setInspectorCollapsed(true)}
              style={{
                fontSize: 12,
                color: '#9CA3AF',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
              }}
            >
              <PanelRightClose size={14} />
              <span>收起面板</span>
            </button>
          </div>
          <InspectorPanel
            deviceMode={deviceMode}
            simMode={simMode}
            specOverlay={specOverlay}
            onChangeDevice={onChangeDevice}
            onChangeSimMode={onChangeSimMode}
            onToggleSpecOverlay={onToggleSpecOverlay}
            onJumpStepDemo={onJumpStepDemo}
          />
        </aside>
      )}
    </div>
  );
};
