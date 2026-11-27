import React, { useMemo } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';

interface NavBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ title, showBack = false, onBack }) => {
  const metrics = useMemo(() => {
    try {
      const win = Taro.getWindowInfo();
      const menu = Taro.getMenuButtonBoundingClientRect();
      const statusBarHeight = win.statusBarHeight ?? 20;
      const validMenu = menu && menu.height > 0 && menu.top >= statusBarHeight;
      const navHeight = validMenu
        ? Math.max(44, (menu.top - statusBarHeight) * 2 + menu.height)
        : 44;
      const capsuleRightPadding = validMenu
        ? Math.max(96, win.windowWidth - menu.left + 8)
        : 96;
      return {
        statusBarHeight,
        navHeight,
        totalHeight: statusBarHeight + navHeight,
        capsuleRightPadding,
      };
    } catch {
      return { statusBarHeight: 44, navHeight: 44, totalHeight: 88, capsuleRightPadding: 96 };
    }
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    Taro.navigateBack({ delta: 1 }).catch(() => {
      Taro.switchTab({ url: '/pages/home/index' });
    });
  };

  return (
    <>
      <View style={{ height: `${metrics.totalHeight}px`, width: '100%' }} />
      <View
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid #EAE2D6',
          paddingTop: `${metrics.statusBarHeight}px`,
        }}
      >
        <View
          style={{
            height: `${metrics.navHeight}px`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: showBack ? '8px' : '16px',
            paddingRight: `${metrics.capsuleRightPadding}px`,
          }}
        >
          {showBack && (
            <View
              onClick={handleBack}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 600,
                color: '#2C2621',
              }}
            >
              <Text>‹</Text>
            </View>
          )}
          <Text
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#2C2621',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    </>
  );
};
