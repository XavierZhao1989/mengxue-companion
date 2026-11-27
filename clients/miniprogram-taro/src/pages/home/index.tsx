import { useCallback, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { NavBar } from '../../components/NavBar';
import {
  fetchDashboardMp,
  switchChildMp,
  type DashboardPayload,
} from '../../services/client';

export default function HomePage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'success'>('loading');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const payload = await fetchDashboardMp();
      setData(payload);
      setStatus(payload.todayLesson ? 'success' : 'empty');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络开小差了，请稍后重试');
      setStatus('error');
    }
  }, []);

  useDidShow(() => {
    loadData();
  });

  const handleOpenReader = (lessonId: string) => {
    const childId = data?.activeChild.id ?? 'child-lele';
    Taro.navigateTo({
      url: `/pages/reader/index?id=${encodeURIComponent(lessonId)}&childId=${encodeURIComponent(childId)}`,
    });
  };

  return (
    <View className='mx-page'>
      <NavBar title='今日伴读' />

      <View className='mx-container'>
        {status === 'loading' && (
          <View>
            <View className='mx-skeleton' style={{ height: '36px', width: '50%', marginBottom: '14px' }} />
            <View className='mx-skeleton' style={{ height: '210px', width: '100%', marginBottom: '14px' }} />
            <View className='mx-skeleton' style={{ height: '90px', width: '100%' }} />
          </View>
        )}

        {status === 'error' && (
          <View className='mx-card' style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Text style={{ display: 'block', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
              加载遇到一点小状况
            </Text>
            <Text style={{ display: 'block', color: '#6B6056', fontSize: '13px', marginBottom: '16px' }}>
              {errorMsg}
            </Text>
            <View className='mx-btn-primary' onClick={loadData}>
              重新加载
            </View>
          </View>
        )}

        {status === 'empty' && (
          <View className='mx-card' style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Text style={{ display: 'block', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
              今天还没有安排伴读篇目
            </Text>
            <Text style={{ display: 'block', color: '#6B6056', fontSize: '13px', marginBottom: '16px' }}>
              去蒙学馆挑一篇适合孩子年龄的经典吧
            </Text>
            <View
              className='mx-btn-primary'
              onClick={() => Taro.switchTab({ url: '/pages/library/index' })}
            >
              去蒙学馆挑一篇
            </View>
          </View>
        )}

        {status === 'success' && data && data.todayLesson && (
          <View>
            {data.fromCache && (
              <View
                style={{
                  backgroundColor: '#FFF6E0',
                  color: '#7A4B00',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                当前展示离线缓存内容，恢复网络后将同步打卡
              </View>
            )}

            {/* Child Switcher + Hardware Pill */}
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <View style={{ display: 'flex', gap: '8px' }}>
                {data.allChildren.map((child) => {
                  const active = child.id === data.activeChild.id;
                  return (
                    <View
                      key={child.id}
                      onClick={async () => {
                        if (active) return;
                        try {
                          await switchChildMp(child.id);
                          loadData();
                        } catch {
                          Taro.showToast({ title: '切换失败，请重试', icon: 'none' });
                        }
                      }}
                      className='mx-pill'
                      style={{
                        backgroundColor: active ? '#2C2621' : '#FFFFFF',
                        color: active ? '#FFFFFF' : '#6B6056',
                        border: '1px solid #EAE2D6',
                      }}
                    >
                      <Text>{child.avatarEmoji} {child.name}</Text>
                    </View>
                  );
                })}
              </View>

              <View
                className='mx-pill'
                style={{
                  backgroundColor: data.device.connected ? '#E7F4EF' : '#F4EFE6',
                  color: data.device.connected ? '#2F7D63' : '#6B6056',
                }}
              >
                <Text>{data.device.connected ? `伴读笔 ${data.device.battery}%` : '仅手机领读'}</Text>
              </View>
            </View>

            {/* Hero Today Card */}
            <View className='mx-card'>
              <View
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <View
                  className='mx-pill'
                  style={{ backgroundColor: '#FCEEE8', color: '#C85A32' }}
                >
                  <Text>今日睡前推荐</Text>
                </View>
                <Text style={{ fontSize: '12px', color: '#9A8F84' }}>
                  约 {data.todayLesson.durationMinutes} 分钟
                </Text>
              </View>

              <Text style={{ display: 'block', fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
                {data.todayLesson.title}
              </Text>
              <Text style={{ display: 'block', fontSize: '13px', color: '#6B6056', marginBottom: '12px' }}>
                {data.todayLesson.summary}
              </Text>

              <View
                style={{
                  backgroundColor: '#FAF7F2',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#6B6056',
                  marginBottom: '14px',
                }}
              >
                <Text style={{ fontWeight: 700, color: '#2C2621' }}>伴读小贴士：</Text>
                <Text>{data.todayLesson.parentGuide}</Text>
              </View>

              <View
                className='mx-btn-primary'
                onClick={() => handleOpenReader(data.todayLesson!.id)}
              >
                {data.todayProgress && data.todayProgress.lineIndex > 0
                  ? `继续伴读（第 ${data.todayProgress.lineIndex + 1} 句）`
                  : `开始 ${data.todayLesson.durationMinutes} 分钟伴读`}
              </View>
            </View>

            {/* Streak Summary */}
            <View className='mx-card' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ display: 'block', fontWeight: 700, fontSize: '15px' }}>伴读坚持记录</Text>
                <Text style={{ fontSize: '12px', color: '#9A8F84' }}>
                  累计伴读 {data.activeChild.totalMinutes} 分钟
                </Text>
              </View>
              <Text style={{ fontSize: '16px', fontWeight: 700, color: '#C85A32' }}>
                已连续 {data.activeChild.streakDays} 天
              </Text>
            </View>

            {/* Plan List */}
            {data.planLessons.map((item) => (
              <View
                key={item.id}
                className='mx-card'
                onClick={() => handleOpenReader(item.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View>
                  <Text style={{ display: 'block', fontWeight: 600, fontSize: '15px' }}>{item.title}</Text>
                  <Text style={{ fontSize: '12px', color: '#9A8F84' }}>
                    {item.subtitle} · {item.lines.length} 句
                  </Text>
                </View>
                <Text style={{ color: '#9A8F84', fontSize: '18px' }}>›</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
