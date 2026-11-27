import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  completeCheckInRn,
  fetchLessonByIdRn,
  saveProgressRn,
  type CharNote,
  type PrimerLesson,
} from '../services/api';
import { COLORS, SPACING } from '../theme';

interface ReaderScreenProps {
  lessonId: string;
  childId: string;
  onBack: () => void;
  onCheckedIn: () => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  lessonId,
  childId,
  onBack,
  onCheckedIn,
}) => {
  const [lesson, setLesson] = useState<PrimerLesson | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [showPinyin, setShowPinyin] = useState(true);
  const [rate, setRate] = useState<0.75 | 1.0>(0.75);
  const [speaking, setSpeaking] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CharNote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLesson = useCallback((signal?: AbortSignal) => {
    setLoadError(null);
    fetchLessonByIdRn(lessonId, childId, signal)
      .then((res) => {
        if (!res.lesson) {
          setLoadError('未找到该伴读篇目');
          return;
        }
        setLesson(res.lesson);
        if (res.progress && res.lesson.lines.length > 0) {
          setLineIndex(Math.min(res.progress.lineIndex, res.lesson.lines.length - 1));
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setLoadError(err instanceof Error ? err.message : '加载失败，请重试');
      });
  }, [lessonId, childId]);

  useEffect(() => {
    const controller = new AbortController();
    loadLesson(controller.signal);

    return () => {
      controller.abort();
      Speech.stop();
    };
  }, [loadLesson]);

  const handleBack = () => {
    Speech.stop();
    setSpeaking(false);
    if (lesson && lineIndex > 0) {
      Alert.alert('先歇一会儿吗？', `已保存读到第 ${lineIndex + 1} 句，下次可直接续读。`, [
        { text: '继续伴读', style: 'cancel' },
        { text: '保存退出', onPress: onBack },
      ]);
      return;
    }
    onBack();
  };

  const handleSpeak = () => {
    if (!lesson) return;
    const text = lesson.lines[lineIndex]?.text ?? '';
    if (!text) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(text, {
      language: 'zh-CN',
      rate,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const changeLine = (next: number) => {
    if (!lesson) return;
    Speech.stop();
    setSpeaking(false);
    const clamped = Math.max(0, Math.min(lesson.lines.length - 1, next));
    setLineIndex(clamped);
    saveProgressRn(childId, lesson.id, clamped).catch(() => {});
  };

  const handleCheckIn = async () => {
    if (!lesson || submitting) return;
    Speech.stop();
    setSubmitting(true);
    try {
      const res = await completeCheckInRn(childId, lesson.id, lesson.durationMinutes);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onCheckedIn();
      Alert.alert(
        '今日伴读打卡成功',
        `已累计连续伴读 ${res.child.streakDays} 天！`,
        [{ text: '返回今日伴读', onPress: onBack }]
      );
    } catch (err) {
      Alert.alert('提交失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError && !lesson) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>篇目加载失败</Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: COLORS.textSecondary }}>{loadError}</Text>
        <Pressable
          style={{
            marginTop: 14,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: COLORS.brandPrimary,
          }}
          onPress={() => loadLesson()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brandPrimary} size='large' />
      </View>
    );
  }

  const line = lesson.lines[lineIndex];
  const noteMap = new Map(lesson.charNotes.map((n) => [n.char, n]));
  const isLast = lineIndex >= lesson.lines.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={{ fontSize: 20, color: COLORS.textPrimary }}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
        <Pressable onPress={() => setShowPinyin((v) => !v)} style={styles.pinyinPill}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandPrimary }}>
            {showPinyin ? '拼音开' : '拼音关'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.muted}>
            第 {lineIndex + 1} / {lesson.lines.length} 句
          </Text>
          <Pressable
            onPress={() => setRate((r) => (r === 0.75 ? 1.0 : 0.75))}
            style={styles.rateChip}
          >
            <Text style={{ fontSize: 12, fontWeight: '600' }}>语速 {rate}x</Text>
          </Pressable>
        </View>

        <View style={styles.paperCard}>
          <View style={styles.charWrap}>
            {Array.from(line.text).map((ch, idx) => {
              const py = line.pinyin[idx] ?? '';
              const note = noteMap.get(ch);
              return (
                <Pressable
                  key={`${idx}-${ch}`}
                  disabled={!note}
                  onPress={() => {
                    if (!note) return;
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedNote(note);
                  }}
                  style={[styles.charCell, note && styles.charCellNoted]}
                >
                  {showPinyin && Boolean(py) && (
                    <Text style={[styles.pinyinText, note && { color: COLORS.brandPrimary }]}>
                      {py}
                    </Text>
                  )}
                  <Text style={styles.hanziText}>{ch}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hintText}>点击带橙框的重点字，查看「家长白话讲法」</Text>
        </View>

        <View style={styles.guideCard}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.brandJade }}>
            给孩子这样讲（白话）
          </Text>
          <Text style={styles.vernacular}>{line.vernacular}</Text>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              <Text style={{ fontWeight: '700' }}>亲子互动：</Text>
              {line.parentTip}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <Pressable
          disabled={lineIndex === 0}
          onPress={() => changeLine(lineIndex - 1)}
          style={[styles.dockBtn, lineIndex === 0 && { opacity: 0.4 }]}
        >
          <Text style={{ fontWeight: '600' }}>上一句</Text>
        </Pressable>

        <Pressable onPress={handleSpeak} style={styles.playBtn}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
            {speaking ? '暂停' : '朗读'}
          </Text>
        </Pressable>

        {isLast ? (
          <Pressable
            disabled={submitting}
            onPress={handleCheckIn}
            style={[styles.dockBtn, { backgroundColor: COLORS.brandJade }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
              {submitting ? '提交中…' : '完成打卡'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => changeLine(lineIndex + 1)}
            style={[styles.dockBtn, { backgroundColor: COLORS.brandPrimary }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>下一句</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={Boolean(selectedNote)}
        transparent
        animationType='slide'
        onRequestClose={() => setSelectedNote(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedNote(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {selectedNote && (
              <>
                <Text style={{ fontSize: 28, fontWeight: '700' }}>
                  {selectedNote.char}{' '}
                  <Text style={{ fontSize: 17, color: COLORS.brandPrimary }}>
                    {selectedNote.pinyin}
                  </Text>
                </Text>
                <Text style={{ marginTop: 8, fontSize: 15, color: COLORS.textPrimary }}>
                  {selectedNote.meaning}
                </Text>
                <View style={styles.questionBox}>
                  <Text style={{ fontSize: 14, color: '#1E5543' }}>
                    <Text style={{ fontWeight: '700' }}>可以这样问孩子：</Text>
                    {selectedNote.parentQuestion}
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  backBtn: { minWidth: 56, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  pinyinPill: { backgroundColor: COLORS.brandPrimarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  body: { padding: SPACING.lg, gap: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontSize: 12, color: COLORS.textSecondary },
  rateChip: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paperCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  charWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  charCell: { alignItems: 'center', minWidth: 32, padding: 4, borderRadius: 8 },
  charCellNoted: { backgroundColor: 'rgba(200, 90, 50, 0.08)', borderWidth: 1, borderColor: 'rgba(200, 90, 50, 0.35)' },
  pinyinText: { fontSize: 11, color: COLORS.textMuted },
  hanziText: { fontSize: 28, fontWeight: '600', color: COLORS.textPrimary },
  hintText: { marginTop: 12, fontSize: 12, color: COLORS.brandPrimary },
  guideCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 8,
  },
  vernacular: { fontSize: 15, lineHeight: 23, color: COLORS.textPrimary },
  tipBox: { backgroundColor: COLORS.bgCanvas, padding: 10, borderRadius: 10 },
  tipText: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSurface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: 10,
  },
  dockBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.bgWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  questionBox: { marginTop: 12, backgroundColor: COLORS.brandJadeSoft, padding: 12, borderRadius: 12 },
});
