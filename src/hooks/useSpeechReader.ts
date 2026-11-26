import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechRate = 0.75 | 1.0;

interface UseSpeechReaderOptions {
  onLineComplete?: () => void;
}

export function useSpeechReader(options: UseSpeechReaderOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState<SpeechRate>(0.75);
  const [progressRatio, setProgressRatio] = useState(0);
  const [usingFallbackTimer, setUsingFallbackTimer] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(options.onLineComplete);
  onCompleteRef.current = options.onLineComplete;

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis errors on restricted environments
      }
    }
    setIsPlaying(false);
    setProgressRatio(0);
  }, []);

  const startFallbackTimer = useCallback((textLength: number, speechRate: SpeechRate) => {
    setUsingFallbackTimer(true);
    const totalMs = Math.max(2200, Math.round((textLength * 420) / speechRate));
    const startedAt = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / totalMs);
      setProgressRatio(ratio);
      if (ratio >= 1) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsPlaying(false);
        setProgressRatio(0);
        onCompleteRef.current?.();
      }
    }, 60);
  }, []);

  const playLine = useCallback(
    (text: string, customRate?: SpeechRate) => {
      const targetRate = customRate ?? rate;
      stop();
      setIsPlaying(true);

      const canUseSpeech =
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof SpeechSynthesisUtterance !== 'undefined';

      if (!canUseSpeech) {
        startFallbackTimer(text.length, targetRate);
        return;
      }

      try {
        setUsingFallbackTimer(false);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = targetRate;
        utterance.pitch = 1.05;

        const estMs = Math.max(1800, Math.round((text.length * 400) / targetRate));
        const startedAt = Date.now();
        let finished = false;

        timerRef.current = setInterval(() => {
          const ratio = Math.min(0.95, (Date.now() - startedAt) / estMs);
          setProgressRatio(ratio);
        }, 60);

        const finishSpeech = () => {
          if (finished) return;
          finished = true;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsPlaying(false);
          setProgressRatio(0);
          onCompleteRef.current?.();
        };

        utterance.onend = finishSpeech;
        utterance.onerror = () => {
          if (finished) return;
          finished = true;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          startFallbackTimer(text.length, targetRate);
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        startFallbackTimer(text.length, targetRate);
      }
    },
    [rate, startFallbackTimer, stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    rate,
    setRate,
    progressRatio,
    usingFallbackTimer,
    playLine,
    stop,
  };
}
