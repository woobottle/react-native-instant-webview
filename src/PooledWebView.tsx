import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewProps } from 'react-native-webview';
import type { PooledWebViewProps } from './types';
import { useWebViewPool } from './WebViewPoolProvider';

let borrowerIdCounter = 0;

const PooledWebView: React.FC<PooledWebViewProps> = ({
  poolKey,
  containerStyle,
  onPoolExhausted,
  onBorrowed,
  onReturned,
  source,
  ...webViewProps
}) => {
  const pool = useWebViewPool();
  const instanceIdRef = useRef<string | null>(null);
  const placeholderRef = useRef<View>(null);
  const borrowerIdRef = useRef(poolKey ?? `borrower-${++borrowerIdCounter}`);
  const propsRef = useRef<Partial<WebViewProps>>({ source, ...webViewProps });

  const [borrowed, setBorrowed] = useState(false);
  const [fallback, setFallback] = useState(false);

  // Keep propsRef in sync without triggering re-renders
  propsRef.current = { source, ...webViewProps };

  // Borrow on mount
  useEffect(() => {
    const sourceUri =
      source && 'uri' in source ? (source as { uri: string }).uri : undefined;
    const result = pool.borrow(borrowerIdRef.current, sourceUri);
    if (!result) {
      setFallback(true);
      onPoolExhausted?.();
      return;
    }

    instanceIdRef.current = result.instanceId;
    pool.setInstanceProps(result.instanceId, propsRef.current);
    setBorrowed(true);
    onBorrowed?.(result.instanceId);

    return () => {
      const id = instanceIdRef.current;
      if (id) {
        pool.setInstanceLayout(id, null);
        pool.release(id);
        onReturned?.(id);
        instanceIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update props when source changes (the primary prop that changes)
  useEffect(() => {
    const id = instanceIdRef.current;
    if (!id || !borrowed) return;

    pool.setInstanceProps(id, propsRef.current);
    // Only re-sync when source actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Measure placeholder position
  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      const id = instanceIdRef.current;
      if (!id || !placeholderRef.current) return;

      placeholderRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          pool.setInstanceLayout(id, {
            top: y,
            left: x,
            width,
            height,
          });
        }
      });
    },
    [pool],
  );

  // Pool exhausted — fall back to a regular WebView
  if (fallback) {
    return (
      <View style={[{ flex: 1 }, containerStyle]}>
        <WebView source={source} {...webViewProps} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View
      ref={placeholderRef}
      style={[{ flex: 1 }, containerStyle]}
      onLayout={handleLayout}
    />
  );
};

export default React.memo(PooledWebView);
