import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  Volume2,
} from 'lucide-react';
import { BottomSheet } from '../components/mobile/BottomSheet';
import { MobileHeader } from '../components/mobile/MobileHeader';
import {
  EmptyState,
  ErrorState,
  OfflineBanner,
  ReaderSkeleton,
} from '../components/mobile/StateViews';
import type { ToastVariant } from '../components/mobile/Toast';
import { useAsyncData } from '../hooks/useAsyncData';
import { useSpeechReader } from '../hooks/useSpeechReader';
import {
  completeCheckIn,
  fetchLessonById,
  saveReadingProgressSync,
} from '../services/api';
import type { CharNote, SimDeviceMode, SimNetworkMode } from '../types/domain';

interface ReaderPageProps {
  lessonId: string;
  activeChildId: string;
  simMode: SimNetworkMode;
  deviceMode: SimDeviceMode;
  showFrameChrome: boolean;
  onBack: () => void;
  onShowToast: (msg: string, variant?: ToastVariant) => void;
  onDataMutated: () => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({
  lessonId,
  activeChildId,
  simMode,
  deviceMode,
  showFrameChrome,
  onBack,
  onShowToast,
  onDataMutated,
}) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [showPinyin, setShowPinyin] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [selectedChar, setSelectedChar] = useState<CharNote | null>(null);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    streakDays: number;
    alreadyCheckedToday: boolean;
  } | null>(null);

  const { status, data, error, isSlow, fromCache, retry } = useAsyncData(
    (signal) => fetchLessonById(lessonId, simMode, signal),
    {
      deps: [lessonId, simMode],
      isEmpty: (res) => !res.lesson,
    }
  );

  const lesson = data?.lesson ?? null;

  useEffect(() => {
    if (data?.progress && data.lesson) {
      const clamped = Math.min(data.progress.lineIndex, data.lesson.lines.length - 1);
      setLineIndex(Math.max(0, clamped));
    } else {
      setLineIndex(0);
    }
  }, [data]);

  const { isPlaying, rate, setRate, progressRatio, usingFallbackTimer, playLine, stop } =
    useSpeechReader({
      onLineComplete: () => {
        if (!lesson || !autoAdvance) return;
        setLineIndex((curr) => {
          if (curr < lesson.lines.length - 1) {
            const next = curr + 1;
            saveReadingProgressSync(activeChildId, lesson.id, next);
            return next;
          }
          return curr;
        });
      },
    });

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const handleBackRequest = () => {
    stop();
    if (lesson && lineIndex > 0 && !celebrationData) {
      setExitConfirmOpen(true);
      return;
    }
    onBack();
  };

  const handleSelectLine = (nextIdx: number) => {
    if (!lesson) return;
    stop();
    const clamped = Math.max(0, Math.min(lesson.lines.length - 1, nextIdx));
    setLineIndex(clamped);
    saveReadingProgressSync(activeChildId, lesson.id, clamped);
  };

  const handleTogglePlay = () => {
    if (!lesson) return;
    const currentLine = lesson.lines[lineIndex];
    if (!currentLine) return;
    if (isPlaying) {
      stop();
    } else {
      playLine(currentLine.text, rate);
    }
  };

  const handleToggleRate = () => {
    const nextRate = rate === 0.75 ? 1.0 : 0.75;
    setRate(nextRate);
    if (isPlaying && lesson) {
      playLine(lesson.lines[lineIndex].text, nextRate);
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!lesson || submittingCheckIn) return;
    stop();
    setSubmittingCheckIn(true);
    setCheckInError(null);
    try {
      const res = await completeCheckIn(lesson.id, lesson.durationMinutes, simMode);
      setCelebrationData({
        streakDays: res.child.streakDays,
        alreadyCheckedToday: res.alreadyCheckedToday,
      });
      onDataMutated();
    } catch (err) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : '打卡提交失败，请重试';
      setCheckInError(msg);
      onShowToast(msg, 'error');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const currentLine = lesson?.lines[lineIndex];
  const isLastLine = lesson ? lineIndex >= lesson.lines.length - 1 : false;
  const charNoteMap = new Map<string, CharNote>(
    (lesson?.charNotes ?? []).map((note) => [note.char, note])
  );

  return (
    <div
      className="anim-page-slide"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-canvas)',
        position: 'relative',
      }}
    >
      <MobileHeader
        title={lesson?.title ?? '逐句领读'}
        deviceMode={deviceMode}
        showFrameChrome={showFrameChrome}
        onBack={handleBackRequest}
        rightSlot={
          lesson ? (
            <button
              type="button"
              onClick={() => setShowPinyin((v) => !v)}
              className="pressable"
              style={{
                minHeight: 32,
                padding: '0 10px',
                borderRadius: 'var(--radius-pill)',
                background: showPinyin ? 'var(--brand-primary-soft)' : 'var(--bg-surface-warm)',
                color: showPinyin ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {showPinyin ? '拼音 开' : '拼音 关'}
            </button>
          ) : null
        }
      />

      <div className="scroll-y" style={{ flex: 1, paddingBottom: 20 }}>
        {status === 'loading' && <ReaderSkeleton isSlow={isSlow} />}

        {status === 'error' && <ErrorState error={error} onRetry={retry} />}

        {(status === 'empty' || (status === 'success' && !lesson)) && (
          <EmptyState
            title="未找到这篇蒙学内容"
            description="可能已被后台下架或移除，返回选一篇其他经典吧。"
            actionLabel="返回上一页"
            onAction={onBack}
          />
        )}

        {status === 'success' && lesson && currentLine && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fromCache && <OfflineBanner />}

            {/* Progress & Controls Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>
                  第 <strong>{lineIndex + 1}</strong> / {lesson.lines.length} 句
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleToggleRate}
                    className="pressable"
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    语速 {rate}x
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoAdvance((v) => !v)}
                    className="pressable"
                    style={{
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      background: autoAdvance ? 'var(--brand-jade-soft)' : 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: autoAdvance ? 'var(--brand-jade)' : 'var(--text-secondary)',
                    }}
                  >
                    {autoAdvance ? '连读 开' : '单句停'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: 'var(--bg-surface-warm)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${((lineIndex + 1) / lesson.lines.length) * 100}%`,
                    background: 'var(--brand-primary)',
                    borderRadius: 99,
                    transition: 'width 240ms var(--ease-out)',
                  }}
                />
              </div>
            </div>

            {/* Primer Paper Card */}
            <section
              aria-label="当前朗读句"
              data-spec-pad="24px"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '26px 18px 22px',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {/* Reading Speech Progress Bar */}
              {isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 16,
                    right: 16,
                    height: 3,
                    borderRadius: 99,
                    background: 'var(--brand-primary-soft)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round(progressRatio * 100)}%`,
                      background: 'var(--brand-primary)',
                      transition: 'width 80ms linear',
                    }}
                  />
                </div>
              )}

              <div
                className="t-primer"
                data-spec-type="Primer 28/46"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '10px 6px',
                  color: 'var(--text-primary)',
                }}
              >
                {Array.from(currentLine.text).map((char, idx) => {
                  const py = currentLine.pinyin[idx] ?? '';
                  const note = charNoteMap.get(char);
                  const isPunctuation = !py;

                  if (isPunctuation) {
                    return (
                      <span
                        key={`${idx}-${char}`}
                        style={{ alignSelf: 'flex-end', paddingBottom: 2, color: 'var(--text-secondary)' }}
                      >
                        {char}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={`${idx}-${char}`}
                      type="button"
                      disabled={!note}
                      onClick={() => note && setSelectedChar(note)}
                      className={note ? 'pressable' : undefined}
                      aria-label={note ? `查看「${char}」家长讲法` : char}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 34,
                        padding: '2px 3px',
                        borderRadius: 8,
                        background: note ? 'rgba(200, 90, 50, 0.06)' : 'transparent',
                        borderBottom: note ? '2px dotted var(--brand-primary)' : 'none',
                        cursor: note ? 'pointer' : 'default',
                        opacity: 1,
                      }}
                    >
                      {showPinyin && (
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            lineHeight: '16px',
                            color: note ? 'var(--brand-primary)' : 'var(--text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          {py}
                        </span>
                      )}
                      <span>{char}</span>
                    </button>
                  );
                })}
              </div>

              {lesson.charNotes.length > 0 && (
                <p
                  style={{
                    margin: '14px 0 0',
                    fontSize: 12,
                    color: 'var(--brand-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <HelpCircle size={13} />
                  <span>点带下划线的字，看「给孩子怎么讲」</span>
                </p>
              )}

              {isPlaying && usingFallbackTimer && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <Volume2 size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  伴读节奏领读中（设备静音时以进度条引导）
                </div>
              )}
            </section>

            {/* Vernacular & Parent Interaction Card */}
            <section
              aria-label="家长白话讲法"
              data-spec-pad="16px"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-jade)' }}>
                  给孩子这样讲（白话）
                </div>
                <p
                  className="t-body"
                  data-spec-type="Body 15/24"
                  style={{ margin: '4px 0 0', color: 'var(--text-primary)' }}
                >
                  {currentLine.vernacular}
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: 13,
                  lineHeight: '20px',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>亲子互动：</strong>
                {currentLine.parentTip}
              </div>
            </section>

            {/* Inline Check-In Error Retry Card */}
            {checkInError && (
              <div
                role="alert"
                style={{
                  background: 'var(--brand-danger-soft)',
                  border: '1px solid rgba(207, 63, 56, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  fontSize: 13,
                  color: 'var(--brand-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>{checkInError}</span>
                <button
                  type="button"
                  onClick={handleCompleteCheckIn}
                  className="pressable"
                  style={{
                    flexShrink: 0,
                    background: 'var(--brand-danger)',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  重试打卡
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Thumb-Zone Dock */}
      {status === 'success' && lesson && (
        <div
          className="spec-safe-bottom"
          style={{
            flexShrink: 0,
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '10px 16px calc(12px + var(--safe-bottom))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <button
            type="button"
            disabled={lineIndex === 0}
            onClick={() => handleSelectLine(lineIndex - 1)}
            className="pressable touch-target"
            data-spec-touch="上一句 ≥44pt"
            style={{
              height: 46,
              padding: '0 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-warm)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              gap: 4,
            }}
          >
            <ChevronLeft size={18} />
            <span>上一句</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className="pressable"
            data-spec-touch="朗读 54×54pt"
            aria-label={isPlaying ? '暂停朗读' : '朗读本句'}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: isPlaying ? 'var(--text-primary)' : 'var(--brand-primary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(200, 90, 50, 0.25)',
              flexShrink: 0,
            }}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
          </button>

          {isLastLine ? (
            <button
              type="button"
              onClick={handleCompleteCheckIn}
              disabled={submittingCheckIn}
              className="pressable touch-target"
              data-spec-touch="打卡 ≥44pt"
              style={{
                height: 46,
                padding: '0 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-jade)',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                gap: 6,
              }}
            >
              <CheckCircle2 size={17} />
              <span>{submittingCheckIn ? '提交中…' : '完成打卡'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectLine(lineIndex + 1)}
              className="pressable touch-target"
              data-spec-touch="下一句 ≥44pt"
              style={{
                height: 46,
                padding: '0 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-warm)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 600,
                gap: 4,
              }}
            >
              <span>下一句</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* Character Note BottomSheet */}
      <BottomSheet
        open={Boolean(selectedChar)}
        title="家长讲字小锦囊"
        onClose={() => setSelectedChar(null)}
      >
        {selectedChar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                className="t-primer"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                }}
              >
                {selectedChar.char}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {selectedChar.pinyin}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4 }}>
                  {selectedChar.meaning}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--brand-jade-soft)',
                borderRadius: 'var(--radius-md)',
                padding: 14,
                fontSize: 14,
                color: '#1E5543',
                lineHeight: '22px',
              }}
            >
              <strong>可以这样问孩子：</strong>
              {selectedChar.parentQuestion}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Mid-session Exit Confirmation BottomSheet */}
      <BottomSheet
        open={exitConfirmOpen}
        title="先歇一会儿吗？"
        onClose={() => setExitConfirmOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: '22px' }}>
            已自动记住读到第 <strong>{lineIndex + 1}</strong> 句，下次回来可以接着念，不用从头开始。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setExitConfirmOpen(false);
                onBack();
              }}
              className="pressable"
              style={{
                height: 46,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-warm)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              保存进度并退出
            </button>
            <button
              type="button"
              onClick={() => setExitConfirmOpen(false)}
              className="pressable"
              style={{
                height: 46,
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              继续伴读
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Celebration Modal */}
      {celebrationData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="伴读打卡成功"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 75,
            background: 'rgba(24, 20, 17, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            className="anim-fade-up"
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 20px 22px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-elevated)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              className="anim-stamp-pop"
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'var(--brand-jade-soft)',
                border: '3px solid var(--brand-jade)',
                color: 'var(--brand-jade)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={36} />
            </div>
            <h3 className="t-h1" style={{ margin: 0 }}>
              {celebrationData.alreadyCheckedToday ? '又完成一遍伴读！' : '今日伴读打卡成功'}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              已累计连续陪伴阅读 <strong style={{ color: 'var(--brand-primary)' }}>{celebrationData.streakDays}</strong> 天，给坚持的家长和宝贝点个赞！
            </p>
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 6,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setCelebrationData(null);
                  onBack();
                }}
                className="pressable"
                style={{
                  height: 46,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-primary)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                返回今日伴读
              </button>
              <button
                type="button"
                onClick={() => {
                  setCelebrationData(null);
                  setLineIndex(0);
                }}
                className="pressable"
                style={{
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                再陪孩子读一遍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
