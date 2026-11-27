import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  fetchDashboardRn,
  switchChildRn,
  type DashboardPayload,
} from '../services/api';
import { COLORS, SPACING } from '../theme';

interface HomeScreenProps {
  refreshKey: number;
  onOpenReader: (lessonId: string, childId: string) => void;
  onGoLibrary: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  refreshKey,
  onOpenReader,
  onGoLibrary,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    fetchDashboardRn(signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : '加载失败，请重试');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brandPrimary} size='large' />
        <Text style={styles.mutedText}>正在加载今日伴读…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.titleText}>加载遇到一点小状况</Text>
        <Text style={styles.mutedText}>{errorMsg}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => load()}>
          <Text style={styles.primaryBtnText}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || !data.todayLesson) {
    return (
      <View style={styles.center}>
        <Text style={styles.titleText}>今天还没有安排伴读篇目</Text>
        <Pressable style={styles.primaryBtn} onPress={onGoLibrary}>
          <Text style={styles.primaryBtnText}>去蒙学馆挑一篇</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {data.fromCache && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>离线缓存模式：联网后同步打卡</Text>
        </View>
      )}

      <View style={styles.topRow}>
        <View style={styles.rowGap}>
          {data.allChildren.map((c) => {
            const active = c.id === data.activeChild.id;
            return (
              <Pressable
                key={c.id}
                onPress={async () => {
                  if (active) return;
                  Haptics.selectionAsync().catch(() => {});
                  await switchChildRn(c.id);
                  load();
                }}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {c.avatarEmoji} {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.pill, styles.devicePill]}>
          <Text style={styles.deviceText}>
            {data.device.connected ? `伴读笔 ${data.device.battery}%` : '仅手机领读'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.badgeSoft}>
            <Text style={styles.badgeSoftText}>今日睡前推荐</Text>
          </View>
          <Text style={styles.mutedText}>约 {data.todayLesson.durationMinutes} 分钟</Text>
        </View>

        <Text style={styles.heroTitle}>{data.todayLesson.title}</Text>
        <Text style={styles.bodyText}>{data.todayLesson.summary}</Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: '700' }}>伴读小贴士：</Text>
            {data.todayLesson.parentGuide}
          </Text>
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenReader(data.todayLesson!.id, data.activeChild.id);
          }}
        >
          <Text style={styles.primaryBtnText}>
            {data.todayProgress && data.todayProgress.lineIndex > 0
              ? `继续伴读（第 ${data.todayProgress.lineIndex + 1} 句）`
              : `开始 ${data.todayLesson.durationMinutes} 分钟伴读`}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.sectionTitle}>7 日伴读足迹</Text>
          <Text style={{ color: COLORS.brandPrimary, fontWeight: '700' }}>
            已连续 {data.activeChild.streakDays} 天
          </Text>
        </View>
        <Text style={[styles.mutedText, { marginTop: 4 }]}>
          累计伴读 {data.activeChild.totalMinutes} 分钟 · 已读 {data.activeChild.completedLessonIds.length} 篇
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: SPACING.lg, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  pillActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
  devicePill: { backgroundColor: COLORS.brandJadeSoft, borderColor: 'transparent' },
  deviceText: { fontSize: 12, fontWeight: '600', color: COLORS.brandJade },
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 10,
  },
  badgeSoft: {
    backgroundColor: COLORS.brandPrimarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSoftText: { color: COLORS.brandPrimary, fontSize: 12, fontWeight: '600' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  titleText: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  bodyText: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  mutedText: { fontSize: 12, color: COLORS.textMuted },
  tipBox: { backgroundColor: COLORS.bgCanvas, padding: 12, borderRadius: 10 },
  tipText: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  offlineBanner: { backgroundColor: COLORS.brandAmberSoft, padding: 10, borderRadius: 12 },
  offlineText: { color: '#7A4B00', fontSize: 12 },
});
