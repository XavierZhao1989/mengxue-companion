import { useCallback, useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Input, Text, View } from '@tarojs/components';
import { NavBar } from '../../components/NavBar';
import {
  fetchDashboardMp,
  fetchLessonsMp,
  setTodayLessonMp,
  type PrimerLesson,
} from '../../services/client';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'mengxue', label: '蒙学经典' },
  { id: 'poetry', label: '唐诗吟诵' },
  { id: 'shenglv', label: '声律启蒙' },
];

export default function LibraryPage() {
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<PrimerLesson[]>([]);
  const [activeChildId, setActiveChildId] = useState('child-lele');
  const [todayId, setTodayId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, dash] = await Promise.all([
        fetchLessonsMp({ category, keyword }),
        fetchDashboardMp(),
      ]);
      setItems(listRes.items);
      setActiveChildId(dash.activeChild.id);
      setTodayId(dash.activeChild.todayLessonId);
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [category, keyword]);

  useDidShow(() => {
    load();
  });

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 260);
    return () => clearTimeout(t);
  }, [load]);

  const handleSetToday = async (lesson: PrimerLesson) => {
    try {
      await setTodayLessonMp(activeChildId, lesson.id);
      setTodayId(lesson.id);
      Taro.showToast({ title: `已设为今日伴读`, icon: 'success' });
    } catch {
      Taro.showToast({ title: '设置失败', icon: 'none' });
    }
  };

  return (
    <View className='mx-page'>
      <NavBar title='蒙学馆' />
      <View className='mx-container'>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '999px',
            border: '1px solid #EAE2D6',
            padding: '8px 14px',
            marginBottom: '12px',
          }}
        >
          <Input
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
            placeholder='搜索篇名或关键词'
            style={{ fontSize: '14px' }}
          />
        </View>

        <View style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {CATEGORIES.map((c) => (
            <View
              key={c.id}
              onClick={() => setCategory(c.id)}
              className='mx-pill'
              style={{
                backgroundColor: category === c.id ? '#C85A32' : '#FFFFFF',
                color: category === c.id ? '#FFFFFF' : '#6B6056',
                border: '1px solid #EAE2D6',
              }}
            >
              <Text>{c.label}</Text>
            </View>
          ))}
        </View>

        {loading && <View className='mx-skeleton' style={{ height: '140px' }} />}

        {!loading && items.length === 0 && (
          <View className='mx-card' style={{ textAlign: 'center', padding: '28px 16px' }}>
            <Text style={{ display: 'block', color: '#6B6056', marginBottom: '12px' }}>
              没有找到匹配的篇目
            </Text>
            <View
              className='mx-btn-primary'
              onClick={() => {
                setCategory('all');
                setKeyword('');
              }}
            >
              清空筛选条件
            </View>
          </View>
        )}

        {!loading &&
          items.map((item) => {
            const isToday = item.id === todayId;
            return (
              <View key={item.id} className='mx-card'>
                <View
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages/reader/index?id=${encodeURIComponent(item.id)}&childId=${encodeURIComponent(activeChildId)}`,
                    })
                  }
                >
                  <Text style={{ display: 'block', fontSize: '16px', fontWeight: 700 }}>{item.title}</Text>
                  <Text style={{ display: 'block', fontSize: '13px', color: '#6B6056', marginTop: '4px' }}>
                    {item.summary}
                  </Text>
                </View>
                <View style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <View
                    onClick={() => !isToday && handleSetToday(item)}
                    className='mx-pill'
                    style={{
                      backgroundColor: isToday ? '#E7F4EF' : '#FCEEE8',
                      color: isToday ? '#2F7D63' : '#C85A32',
                    }}
                  >
                    <Text>{isToday ? '今日伴读' : '+ 设为今日'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
      </View>
    </View>
  );
}
