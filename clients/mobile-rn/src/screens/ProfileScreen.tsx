import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchDashboardRn, type DashboardPayload } from '../services/api';
import { COLORS, SPACING } from '../theme';

const PRIVACY_URL = 'https://mengxue-companion.vercel.app/privacy.html';

export const ProfileScreen: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [privacyVisible, setPrivacyVisible] = useState(false);

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

  const child = data?.activeChild;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brandPrimary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {errorMsg && (
        <View style={styles.card}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>档案加载失败</Text>
          <Text style={styles.sub}>{errorMsg}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => load()}>
            <Text style={styles.primaryBtnText}>重新加载</Text>
          </Pressable>
        </View>
      )}

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

      <View style={styles.card}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>关于与隐私政策</Text>
        <Text style={styles.sub}>
          启蒙小笺 v1.0.0 · 仅保存必要伴读进度与离线缓存，不含任何第三方广告与追踪 SDK。
        </Text>
        <View style={styles.linkRow}>
          <Pressable style={styles.linkPill} onPress={() => setPrivacyVisible(true)}>
            <Text style={styles.linkPillText}>查看隐私声明</Text>
          </Pressable>
          <Pressable style={styles.linkPill} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
            <Text style={styles.linkPillText}>在线隐私政策页面 ↗</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={privacyVisible}
        transparent
        animationType='slide'
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPrivacyVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.textPrimary }}>
              《启蒙小笺》隐私政策摘要
            </Text>
            <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary }}>
              1. 无需账号即可阅读，不收集手机号、位置、相机、通讯录等敏感权限。{'\n'}
              2. 本地 AsyncStorage 仅缓存篇目与当前句读位置，支持离线继续伴读。{'\n'}
              3. 云端仅同步所选儿童档案 ID、篇目 ID 与打卡日期，不接入任何第三方广告或追踪 SDK。{'\n'}
              4. 联系开发者：zbx7858@gmail.com
            </Text>
            <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={() => setPrivacyVisible(false)}>
              <Text style={styles.primaryBtnText}>我知道了</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  sub: { fontSize: 12, lineHeight: 18, color: COLORS.textMuted },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  kpi: { alignItems: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  linkPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.brandPrimarySoft,
  },
  linkPillText: { fontSize: 12, fontWeight: '600', color: COLORS.brandPrimary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
});
