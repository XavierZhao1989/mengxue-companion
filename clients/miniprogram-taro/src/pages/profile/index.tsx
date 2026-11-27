import { useCallback, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { NavBar } from '../../components/NavBar';
import { fetchDashboardMp, type DashboardPayload } from '../../services/client';

export default function ProfilePage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setStatus('loading');
    try {
      const payload = await fetchDashboardMp();
      setData(payload);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络开小差了，请稍后重试');
      setStatus('error');
    }
  }, []);

  useDidShow(() => {
    loadData();
  });

  const child = data?.activeChild;

  return (
    <View className='mx-page'>
      <NavBar title='伴学档案' />
      <View className='mx-container'>
        {status === 'loading' && (
          <View>
            <View className='mx-skeleton' style={{ height: '140px', width: '100%', marginBottom: '14px' }} />
            <View className='mx-skeleton' style={{ height: '80px', width: '100%' }} />
          </View>
        )}

        {status === 'error' && (
          <View className='mx-card' style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Text style={{ display: 'block', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
              档案加载失败
            </Text>
            <Text style={{ display: 'block', color: '#6B6056', fontSize: '13px', marginBottom: '16px' }}>
              {errorMsg}
            </Text>
            <View className='mx-btn-primary' onClick={loadData}>
              重新加载
            </View>
          </View>
        )}

        {status === 'success' && child && (
          <View className='mx-card'>
            <Text style={{ display: 'block', fontSize: '20px', fontWeight: 700 }}>
              {child.avatarEmoji} {child.name}
            </Text>
            <Text style={{ display: 'block', fontSize: '12px', color: '#9A8F84', marginBottom: '12px' }}>
              {child.ageLabel}
            </Text>
            <View style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <View>
                <Text style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#C85A32' }}>
                  {child.streakDays}
                </Text>
                <Text style={{ fontSize: '11px', color: '#9A8F84' }}>连续天数</Text>
              </View>
              <View>
                <Text style={{ display: 'block', fontSize: '20px', fontWeight: 700 }}>
                  {child.totalMinutes}
                </Text>
                <Text style={{ fontSize: '11px', color: '#9A8F84' }}>累计分钟</Text>
              </View>
              <View>
                <Text style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#2F7D63' }}>
                  {child.completedLessonIds.length}
                </Text>
                <Text style={{ fontSize: '11px', color: '#9A8F84' }}>已读经典</Text>
              </View>
            </View>
          </View>
        )}

        {status === 'success' && data?.device && (
          <View className='mx-card'>
            <Text style={{ display: 'block', fontWeight: 600 }}>{data.device.name}</Text>
            <Text style={{ fontSize: '12px', color: '#9A8F84' }}>
              {data.device.connected ? `已连接 · 电量 ${data.device.battery}%` : '未连接 · 仅手机领读'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
