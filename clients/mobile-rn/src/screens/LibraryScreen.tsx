import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  fetchDashboardRn,
  fetchLessonsRn,
  setTodayLessonRn,
  type PrimerLesson,
} from '../services/api';
import { COLORS, SPACING } from '../theme';

interface LibraryScreenProps {
  onOpenReader: (lessonId: string, childId: string) => void;
  onMutated: () => void;
}

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'mengxue', label: '蒙学经典' },
  { id: 'poetry', label: '唐诗吟诵' },
  { id: 'shenglv', label: '声律启蒙' },
];

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onOpenReader, onMutated }) => {
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<PrimerLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [childId, setChildId] = useState('child-lele');
  const [todayId, setTodayId] = useState('');

  const retryLoad = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorMsg(null);
      Promise.all([
        fetchLessonsRn({ category, keyword }, controller.signal),
        fetchDashboardRn(controller.signal),
      ])
        .then(([listRes, dash]) => {
          setItems(listRes.items);
          setChildId(dash.activeChild.id);
          setTodayId(dash.activeChild.todayLessonId);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setErrorMsg(err instanceof Error ? err.message : '加载失败，请重试');
          setLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [category, keyword, reloadTick]);

  return (
    <View style={styles.container}>
      <View style={styles.filterHeader}>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder='搜索篇名或关键词'
          style={styles.searchInput}
        />
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                style={[styles.catPill, active && styles.catPillActive]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : COLORS.textSecondary }}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brandPrimary} />
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>蒙学馆加载失败</Text>
          <Text style={styles.emptyDesc}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={retryLoad}>
            <Text style={styles.retryBtnText}>重新加载</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>没有找到匹配的篇目</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setCategory('all');
              setKeyword('');
            }}
          >
            <Text style={styles.retryBtnText}>清空筛选条件</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => {
            const isToday = item.id === todayId;
            return (
              <View key={item.id} style={styles.card}>
                <Pressable onPress={() => onOpenReader(item.id, childId)}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.summary}
                  </Text>
                </Pressable>
                <View style={styles.cardFoot}>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {item.durationMinutes} 分钟 · {item.lines.length} 句
                  </Text>
                  <Pressable
                    disabled={isToday}
                    onPress={async () => {
                      try {
                        await setTodayLessonRn(childId, item.id);
                        setTodayId(item.id);
                        onMutated();
                        Alert.alert('已设置', `《${item.title}》已设为今日伴读`);
                      } catch {
                        Alert.alert('设置失败', '网络开小差了，请稍后重试');
                      }
                    }}
                    style={[
                      styles.setBtn,
                      { backgroundColor: isToday ? COLORS.brandJadeSoft : COLORS.brandPrimarySoft },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: isToday ? COLORS.brandJade : COLORS.brandPrimary,
                      }}
                    >
                      {isToday ? '今日伴读' : '+ 设为今日'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.brandPrimary,
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterHeader: {
    padding: SPACING.lg,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  searchInput: {
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  catRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  catPillActive: { backgroundColor: COLORS.brandPrimary, borderColor: COLORS.brandPrimary },
  list: { padding: SPACING.lg, gap: 12 },
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  setBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
