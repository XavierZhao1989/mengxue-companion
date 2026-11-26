import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DemoWorkbench } from './components/inspector/DemoWorkbench';
import { BottomTabBar } from './components/mobile/BottomTabBar';
import { MobileHeader } from './components/mobile/MobileHeader';
import { ToastContainer, type ToastItem, type ToastVariant } from './components/mobile/Toast';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReaderPage } from './pages/ReaderPage';
import { fetchDashboard } from './services/api';
import type { AppRoute, MainTab, SimDeviceMode, SimNetworkMode } from './types/domain';

const TAB_TITLES: Record<MainTab, string> = {
  home: '今日伴读',
  library: '蒙学馆',
  profile: '伴学档案',
};

export const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>({ tab: 'home' });
  const [deviceMode, setDeviceMode] = useState<SimDeviceMode>('iphone15');
  const [lastMobileDevice, setLastMobileDevice] = useState<SimDeviceMode>('iphone15');
  const [simMode, setSimMode] = useState<SimNetworkMode>('normal');
  const [specOverlay, setSpecOverlay] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [activeChildId, setActiveChildId] = useState('child-lele');
  const [todayLessonId, setTodayLessonId] = useState('sanzijing-1');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const handleDataMutated = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard('normal', controller.signal)
      .then((dash) => {
        setActiveChildId(dash.activeChild.id);
        setTodayLessonId(dash.activeChild.todayLessonId);
      })
      .catch(() => {
        // Ignore aborted sync
      });
    return () => controller.abort();
  }, [dataVersion]);

  const handleChangeDevice = (mode: SimDeviceMode) => {
    if (mode !== 'admin') {
      setLastMobileDevice(mode);
    }
    setDeviceMode(mode);
  };

  const handleJumpStepDemo = (step: number) => {
    switch (step) {
      case 1:
        if (deviceMode === 'admin') setDeviceMode(lastMobileDevice);
        setSimMode('normal');
        setSpecOverlay(false);
        setRoute({ tab: 'home' });
        break;
      case 2:
        setDeviceMode('miniprogram');
        setLastMobileDevice('miniprogram');
        setSimMode('normal');
        setRoute({ tab: 'home' });
        showToast('已切换至微信小程序胶囊避让模式', 'info');
        break;
      case 3:
        if (deviceMode === 'admin') setDeviceMode(lastMobileDevice);
        setSimMode('error');
        setRoute({ tab: 'home' });
        showToast('已注入接口超时错误态，可演示重试恢复', 'info');
        break;
      case 4:
        if (deviceMode === 'admin') setDeviceMode(lastMobileDevice);
        setSimMode('normal');
        setSpecOverlay(true);
        showToast('已开启设计标注透视（安全区/间距/热区/字号）', 'info');
        break;
      case 5:
        setDeviceMode('admin');
        break;
      default:
        break;
    }
  };

  if (deviceMode === 'admin') {
    return (
      <>
        <AdminPage
          dataVersion={dataVersion}
          onExitAdmin={() => setDeviceMode(lastMobileDevice)}
          onDataMutated={handleDataMutated}
          onShowToast={showToast}
        />
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 24,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <ToastContainer items={toasts} />
        </div>
      </>
    );
  }

  return (
    <DemoWorkbench
      deviceMode={deviceMode}
      simMode={simMode}
      specOverlay={specOverlay}
      onChangeDevice={handleChangeDevice}
      onChangeSimMode={setSimMode}
      onToggleSpecOverlay={() => setSpecOverlay((v) => !v)}
      onJumpStepDemo={handleJumpStepDemo}
    >
      {(showFrameChrome) => (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <ToastContainer items={toasts} />

          {route.readerLessonId ? (
            <ReaderPage
              lessonId={route.readerLessonId}
              activeChildId={activeChildId}
              simMode={simMode}
              deviceMode={deviceMode}
              showFrameChrome={showFrameChrome}
              onBack={() =>
                setRoute({
                  tab: route.returnTab ?? 'home',
                })
              }
              onShowToast={showToast}
              onDataMutated={handleDataMutated}
            />
          ) : (
            <>
              <MobileHeader
                title={TAB_TITLES[route.tab]}
                deviceMode={deviceMode}
                showFrameChrome={showFrameChrome}
              />

              <main className="scroll-y" style={{ flex: 1 }}>
                {route.tab === 'home' && (
                  <HomePage
                    simMode={simMode}
                    dataVersion={dataVersion}
                    onStartReader={(lessonId) =>
                      setRoute({
                        tab: 'home',
                        readerLessonId: lessonId,
                        returnTab: 'home',
                      })
                    }
                    onGoLibrary={() => setRoute({ tab: 'library' })}
                    onShowToast={showToast}
                    onDataMutated={handleDataMutated}
                  />
                )}

                {route.tab === 'library' && (
                  <LibraryPage
                    simMode={simMode}
                    dataVersion={dataVersion}
                    todayLessonId={todayLessonId}
                    onOpenReader={(lessonId) =>
                      setRoute({
                        tab: 'library',
                        readerLessonId: lessonId,
                        returnTab: 'library',
                      })
                    }
                    onShowToast={showToast}
                    onDataMutated={handleDataMutated}
                  />
                )}

                {route.tab === 'profile' && (
                  <ProfilePage
                    simMode={simMode}
                    dataVersion={dataVersion}
                    onOpenReader={(lessonId) =>
                      setRoute({
                        tab: 'profile',
                        readerLessonId: lessonId,
                        returnTab: 'profile',
                      })
                    }
                    onEnterAdmin={() => setDeviceMode('admin')}
                    onShowToast={showToast}
                    onDataMutated={handleDataMutated}
                  />
                )}
              </main>

              <BottomTabBar
                activeTab={route.tab}
                onChange={(tab) => setRoute({ tab })}
              />
            </>
          )}
        </div>
      )}
    </DemoWorkbench>
  );
};
