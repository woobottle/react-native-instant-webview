import { useCallback } from 'react';
import { useWebViewPool } from './WebViewPoolProvider';
import type { WarmUpHandle, WarmUpOptions } from './types';

export function useWarmUp() {
  const pool = useWebViewPool();

  const warmUp = useCallback(
    (url: string, options?: WarmUpOptions): WarmUpHandle | null => {
      return pool.warmUp(url, options);
    },
    [pool],
  );

  const cancelWarmUp = useCallback(
    (url: string): void => {
      pool.cancelWarmUp(url);
    },
    [pool],
  );

  return { warmUp, cancelWarmUp };
}
