import React from 'react';
import { BookOpen, Compass, User } from 'lucide-react';
import type { MainTab } from '../../types/domain';

interface BottomTabBarProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const TABS: Array<{ id: MainTab; label: string; Icon: React.FC<{ size?: number }> }> = [
  { id: 'home', label: '今日伴读', Icon: BookOpen },
  { id: 'library', label: '蒙学馆', Icon: Compass },
  { id: 'profile', label: '伴学档案', Icon: User },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onChange }) => {
  return (
    <nav
      aria-label="主导航"
      className="spec-safe-bottom"
      style={{
        flexShrink: 0,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'var(--safe-bottom)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          height: 'var(--tabbar-height)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'center',
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="touch-target pressable"
              data-spec-touch={active ? 'Tab ≥44pt' : undefined}
              aria-current={active ? 'page' : undefined}
              style={{
                flexDirection: 'column',
                gap: 3,
                height: '100%',
                color: active ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 500,
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 11, lineHeight: '14px' }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
