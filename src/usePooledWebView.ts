import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import { useWebViewPool } from './WebViewPoolProvider';
import type { UsePooledWebViewReturn } from './types';

let hookBorrowerIdCounter = 0;

export function usePooledWebView(): UsePooledWebViewReturn {
  const pool = useWebViewPool();
  const instanceIdRef = useRef<string | null>(null);
  const webViewRefRef = useRef<RefObject<WebView | null> | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (instanceIdRef.current) {
        pool.release(instanceIdRef.current);
        instanceIdRef.current = null;
        webViewRefRef.current = null;
      }
    };
  }, [pool]);

  const borrow = useCallback(() => {
    if (instanceIdRef.current) {
      return {
        instanceId: instanceIdRef.current,
        webViewRef: webViewRefRef.current!,
      };
    }

    const borrowerId = `hook-borrower-${++hookBorrowerIdCounter}`;
    const result = pool.borrow(borrowerId);
    if (!result) return null;

    instanceIdRef.current = result.instanceId;
    webViewRefRef.current = result.webViewRef;
    setInstanceId(result.instanceId);
    return result;
  }, [pool]);

  const release = useCallback(() => {
    if (instanceIdRef.current) {
      pool.release(instanceIdRef.current);
      instanceIdRef.current = null;
      webViewRefRef.current = null;
      setInstanceId(null);
    }
  }, [pool]);

  return {
    borrow,
    release,
    instanceId,
    webViewRef: webViewRefRef.current,
  };
}
