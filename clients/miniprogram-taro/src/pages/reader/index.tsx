import { useCallback, useEffect, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { NavBar } from '../../components/NavBar';
import {
  completeCheckInMp,
  fetchLessonDetailMp,
  saveProgressMp,
  type CharNote,
  type PrimerLesson,
} from '../../services/client';

function safeDecode(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return fallback;
  }
}

export default function ReaderPage() {
  const router = useRouter();
  const lessonId = safeDecode(router.params.id, 'sanzijing-1');
  const childId = safeDecode(router.params.childId, 'child-lele');

  const [lesson, setLesson] = useState<PrimerLesson | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [showPinyin, setShowPinyin] = useState(true);
  const [activeNote, setActiveNote] = useState<CharNote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [celebrationStreak, setCelebrationStreak] = useState<number | null>(null);

  const safeNavigateBack = () => {
    Taro.navigateBack({ delta: 1 }).catch(() => {
      Taro.switchTab({ url: '/pages/home/index' });
    });
  };

  const loadLesson = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetchLessonDetailMp(lessonId, childId);
      setLesson(res.lesson);
      if (!res.lesson) {
        setLoadError('未找到该伴读篇目');
        return;
      }
      if (res.progress && res.lesson.lines.length > 0) {
        setLineIndex(Math.min(res.progress.lineIndex, res.lesson.lines.length - 1));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载失败，请重试');
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  }, [lessonId, childId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const handleBack = () => {
    if (lesson && lineIndex > 0 && celebrationStreak === null) {
      Taro.showModal({
        title: '先歇一会儿吗？',
        content: `已保存读到第 ${lineIndex + 1} 句，下次可直接续读。`,
        confirmText: '保存退出',
        cancelText: '继续伴读',
      }).then((res) => {
        if (res.confirm) {
          safeNavigateBack();
        }
      });
      return;
    }
    safeNavigateBack();
  };

  const changeLine = (nextIdx: number) => {
    if (!lesson) return;
    const clamped = Math.max(0, Math.min(lesson.lines.length - 1, nextIdx));
    setLineIndex(clamped);
    saveProgressMp(childId, lesson.id, clamped).catch(() => {});
  };

  const handleCheckIn = async () => {
    if (!lesson || submitting) return;
    setSubmitting(true);
    try {
      const res = await completeCheckInMp(childId, lesson.id, lesson.durationMinutes);
      Taro.vibrateShort({ type: 'medium' }).catch(() => {});
      setCelebrationStreak(res.child.streakDays);
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '打卡失败，请重试',
        icon: 'none',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentLine = lesson?.lines[lineIndex];
  const noteMap = new Map((lesson?.charNotes ?? []).map((n) => [n.char, n]));

  return (
    <View className='mx-page' style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar title={lesson?.title ?? '逐句领读'} showBack onBack={handleBack} />

      <View className='mx-container' style={{ flex: 1 }}>
        {lesson && currentLine ? (
          <View>
            <View
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <Text style={{ fontSize: '12px', color: '#6B6056' }}>
                第 {lineIndex + 1} / {lesson.lines.length} 句
              </Text>
              <View
                onClick={() => setShowPinyin((v) => !v)}
                className='mx-pill'
                style={{
                  backgroundColor: showPinyin ? '#FCEEE8' : '#F4EFE6',
                  color: showPinyin ? '#C85A32' : '#6B6056',
                }}
              >
                <Text>{showPinyin ? '拼音 开' : '拼音 关'}</Text>
              </View>
            </View>

            {/* Primer Character Card */}
            <View className='mx-card' style={{ padding: '24px 16px', textAlign: 'center' }}>
              <View style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                {Array.from(currentLine.text).map((ch, idx) => {
                  const py = currentLine.pinyin[idx] ?? '';
                  const note = noteMap.get(ch);
                  return (
                    <View
                      key={`${idx}-${ch}`}
                      onClick={() => note && setActiveNote(note)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: py ? '32px' : '16px',
                        padding: '2px',
                        borderBottom: note ? '2px dotted #C85A32' : 'none',
                      }}
                    >
                      {showPinyin && py && (
                        <Text style={{ fontSize: '11px', color: note ? '#C85A32' : '#9A8F84' }}>
                          {py}
                        </Text>
                      )}
                      <Text style={{ fontSize: '26px', fontWeight: 600 }}>{ch}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: '#C85A32' }}>
                点击带虚线的重点字，查看「家长讲法」
              </Text>
            </View>

            {/* Vernacular Guide */}
            <View className='mx-card'>
              <Text style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2F7D63' }}>
                给孩子这样讲
              </Text>
              <Text style={{ display: 'block', marginTop: '4px', fontSize: '15px' }}>
                {currentLine.vernacular}
              </Text>
              <View
                style={{
                  marginTop: '10px',
                  backgroundColor: '#FAF7F2',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '13px',
                  color: '#6B6056',
                }}
              >
                <Text style={{ fontWeight: 700, color: '#2C2621' }}>亲子互动：</Text>
                <Text>{currentLine.parentTip}</Text>
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <View
                onClick={() => lineIndex > 0 && changeLine(lineIndex - 1)}
                style={{
                  flex: 1,
                  height: '46px',
                  lineHeight: '46px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  backgroundColor: '#F4EFE6',
                  color: lineIndex === 0 ? '#9A8F84' : '#2C2621',
                  fontWeight: 600,
                }}
              >
                上一句
              </View>

              {lineIndex >= lesson.lines.length - 1 ? (
                <View
                  onClick={handleCheckIn}
                  className='mx-btn-primary mx-btn-jade'
                  style={{ flex: 2, height: '46px', lineHeight: '46px' }}
                >
                  {submitting ? '提交中…' : '完成伴读打卡'}
                </View>
              ) : (
                <View
                  onClick={() => changeLine(lineIndex + 1)}
                  className='mx-btn-primary'
                  style={{ flex: 2, height: '46px', lineHeight: '46px' }}
                >
                  下一句
                </View>
              )}
            </View>
          </View>
        ) : loadError ? (
          <View className='mx-card' style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Text style={{ display: 'block', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
              篇目加载失败
            </Text>
            <Text style={{ display: 'block', color: '#6B6056', fontSize: '13px', marginBottom: '16px' }}>
              {loadError}
            </Text>
            <View className='mx-btn-primary' onClick={loadLesson}>
              重新加载
            </View>
          </View>
        ) : (
          <View className='mx-skeleton' style={{ height: '240px' }} />
        )}
      </View>

      {/* Character Note Modal */}
      {activeNote && (
        <View
          catchMove
          onClick={() => setActiveNote(null)}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 100,
          }}
        >
          <View
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '20px 20px calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <Text style={{ fontSize: '26px', fontWeight: 700, marginRight: '10px' }}>
              {activeNote.char}
            </Text>
            <Text style={{ fontSize: '16px', fontWeight: 700, color: '#C85A32' }}>
              {activeNote.pinyin}
            </Text>
            <Text style={{ display: 'block', marginTop: '8px', fontSize: '14px' }}>
              {activeNote.meaning}
            </Text>
            <View
              style={{
                marginTop: '12px',
                backgroundColor: '#E7F4EF',
                padding: '12px',
                borderRadius: '12px',
                color: '#1E5543',
                fontSize: '13px',
              }}
            >
              <Text style={{ fontWeight: 700 }}>可以这样问孩子：</Text>
              <Text>{activeNote.parentQuestion}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Check-in Celebration */}
      {celebrationStreak !== null && (
        <View
          catchMove
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 110,
          }}
        >
          <View className='mx-card' style={{ width: '100%', textAlign: 'center', padding: '26px 20px' }}>
            <Text style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#2F7D63' }}>
              今日伴读打卡成功
            </Text>
            <Text style={{ display: 'block', margin: '10px 0 18px', fontSize: '14px', color: '#6B6056' }}>
              已累计连续陪伴阅读 {celebrationStreak} 天！
            </Text>
            <View
              className='mx-btn-primary'
              onClick={() => {
                setCelebrationStreak(null);
                safeNavigateBack();
              }}
            >
              返回今日伴读
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
