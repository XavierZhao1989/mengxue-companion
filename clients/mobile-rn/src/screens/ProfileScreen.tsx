import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchDashboardRn, type DashboardPayload } from '../services/api';
import { COLORS, SPACING } from '../theme';

export const ProfileScreen: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardRn(controller.signal).then(setData).catch(() => {});
    return () => controller.abort();
  }, [refreshKey]);

  const child = data?.activeChild;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {child && (
        <View style={styles.card}>
          <Text style={styles.name}>
            {child.avatarEmoji} {child.name}
          </Text>
          <Text style={styles.sub}>{child.ageLabel}</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: COLORS.brandPrimary }]}>{child.streakDays}</Text>
              <Text style={styles.kpiLabel}>连续天数</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{child.totalMinutes}</Text>
              <Text style={styles.kpiLabel}>累计分钟</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiVal, { color: COLORS.brandJade }]}>
                {child.completedLessonIds.length}
              </Text>
              <Text style={styles.kpiLabel}>已读经典</Text>
            </View>
          </View>
        </View>
      )}

      {data?.device && (
        <View style={styles.card}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{data.device.name}</Text>
          <Text style={styles.sub}>
            {data.device.connected ? `蓝牙已连接 · 电量 ${data.device.battery}%` : '蓝牙未连接 · 仅手机领读'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, gap: 14 },
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
  },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textMuted },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  kpi: { alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted },
});
