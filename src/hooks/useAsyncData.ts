import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError, AsyncState } from '../types/domain';

interface UseAsyncOptions<T> {
  isEmpty?: (data: T) => boolean;
  deps: unknown[];
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function normalizeError(err: unknown): ApiError {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err
  ) {
    const candidate = err as ApiError;
    return {
      code: candidate.code,
      message: candidate.message,
      retryable: candidate.retryable ?? true,
    };
  }
  if (err instanceof Error) {
    return { code: 'ERR_UNKNOWN', message: err.message, retryable: true };
  }
  return { code: 'ERR_UNKNOWN', message: '请求失败，请稍后重试', retryable: true };
}

export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UseAsyncOptions<T>
): AsyncState<T> & { retry: () => void } {
  const { isEmpty, deps } = options;
  const [reloadTick, setReloadTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  const isEmptyRef = useRef(isEmpty);
  fetcherRef.current = fetcher;
  isEmptyRef.current = isEmpty;

  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: null,
    error: null,
    isSlow: false,
    fromCache: false,
  });

  const retry = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState((prev) => ({
      status: 'loading',
      data: prev.data,
      error: null,
      isSlow: false,
      fromCache: false,
    }));

    const slowTimer = setTimeout(() => {
      if (active && !controller.signal.aborted) {
        setState((prev) =>
          prev.status === 'loading' ? { ...prev, isSlow: true } : prev
        );
      }
    }, 800);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        clearTimeout(slowTimer);
        if (!active || controller.signal.aborted) {
          return;
        }
        const empty = isEmptyRef.current ? isEmptyRef.current(result) : false;
        const hasCacheFlag =
          typeof result === 'object' &&
          result !== null &&
          'fromCache' in result &&
          Boolean((result as { fromCache?: boolean }).fromCache);

        setState({
          status: empty ? 'empty' : 'success',
          data: result,
          error: null,
          isSlow: false,
          fromCache: hasCacheFlag,
        });
      })
      .catch((err: unknown) => {
        clearTimeout(slowTimer);
        if (!active || controller.signal.aborted || isAbortError(err)) {
          return;
        }
        setState((prev) => ({
          status: 'error',
          data: prev.data,
          error: normalizeError(err),
          isSlow: false,
          fromCache: false,
        }));
      });

    return () => {
      active = false;
      clearTimeout(slowTimer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  return { ...state, retry };
}
