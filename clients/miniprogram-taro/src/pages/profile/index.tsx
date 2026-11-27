import { useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { NavBar } from '../../components/NavBar';
import { fetchDashboardMp, type DashboardPayload } from '../../services/client';

export default function ProfilePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);

  useDidShow(() => {
    fetchDashboardMp().then(setData).catch(() => {});
  });

  const child = data?.activeChild;

  return (
    <View className='mx-page'>
      <NavBar title='伴学档案' />
      <View className='mx-container'>
        {child && (
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

        {data?.device && (
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
