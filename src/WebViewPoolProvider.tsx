import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { WebView, WebViewProps } from 'react-native-webview';
import { DEFAULT_POOL_CONFIG } from './constants';
import WebViewManager from './WebViewManager';
import WebViewSlot from './WebViewSlot';
import type {
  BorrowResult,
  InstanceLayout,
  PoolConfig,
  PoolState,
  WarmUpHandle,
  WarmUpOptions,
  WebViewPoolContextValue,
  WebViewPoolProviderProps,
} from './types';

const WebViewPoolContext = createContext<WebViewPoolContextValue | null>(null);

export function useWebViewPool(): WebViewPoolContextValue {
  const ctx = useContext(WebViewPoolContext);
  if (!ctx) {
    throw new Error('useWebViewPool must be used within a WebViewPoolProvider');
  }
  return ctx;
}

export const WebViewPoolProvider: React.FC<WebViewPoolProviderProps> = ({
  config,
  children,
}) => {
  const managerRef = useRef(WebViewManager.getInstance());
  const mergedConfig = useRef<PoolConfig>({
    ...DEFAULT_POOL_CONFIG,
    ...config,
  }).current;

  const [poolState, setPoolState] = useState<PoolState>(() => {
    const mgr = managerRef.current;
    mgr.initialize(mergedConfig);
    return mgr.getState();
  });

  const layoutsRef = useRef<Map<string, InstanceLayout | null>>(new Map());
  const propsRef = useRef<Map<string, Partial<WebViewProps>>>(new Map());

  const [, forceRender] = useState(0);

  useEffect(() => {
    const mgr = managerRef.current;
    const unsub = mgr.subscribe((state) => {
      setPoolState(state);
    });
    return () => {
      unsub();
      mgr.cancelAllWarmUps();
    };
  }, []);

  const borrow = useCallback(
    (borrowerId: string, url?: string): BorrowResult | null => {
      return managerRef.current.borrow(borrowerId, url);
    },
    [],
  );

  const release = useCallback((instanceId: string): void => {
    layoutsRef.current.delete(instanceId);
    propsRef.current.delete(instanceId);
    managerRef.current.release(instanceId);
  }, []);

  const setInstanceLayout = useCallback(
    (instanceId: string, layout: InstanceLayout | null): void => {
      layoutsRef.current.set(instanceId, layout);
      forceRender((c) => c + 1);
    },
    [],
  );

  const setInstanceProps = useCallback(
    (instanceId: string, props: Partial<WebViewProps>): void => {
      propsRef.current.set(instanceId, props);
      forceRender((c) => c + 1);
    },
    [],
  );

  const getInstanceLayout = useCallback(
    (instanceId: string): InstanceLayout | null => {
      return layoutsRef.current.get(instanceId) ?? null;
    },
    [],
  );

  const getInstanceProps = useCallback(
    (instanceId: string): Partial<WebViewProps> | undefined => {
      return propsRef.current.get(instanceId);
    },
    [],
  );

  const getWebViewRef = useCallback(
    (instanceId: string): WebView | null => {
      const inst = managerRef.current
        .getState()
        .instances.find((i) => i.id === instanceId);
      return inst?.webViewRef.current ?? null;
    },
    [],
  );

  const warmUp = useCallback(
    (url: string, options?: WarmUpOptions): WarmUpHandle | null => {
      return managerRef.current.warmUp(url, options);
    },
    [],
  );

  const cancelWarmUp = useCallback((url: string): void => {
    managerRef.current.cancelWarmUp(url);
  }, []);

  const handleCleanupComplete = useCallback((instanceId: string) => {
    managerRef.current.markIdle(instanceId);
  }, []);

  const contextValue = useMemo<WebViewPoolContextValue>(
    () => ({
      state: poolState,
      borrow,
      release,
      setInstanceLayout,
      setInstanceProps,
      getInstanceLayout,
      getInstanceProps,
      getWebViewRef,
      warmUp,
      cancelWarmUp,
    }),
    // All callbacks are stable (useCallback with [] deps).
    // Only poolState triggers a new context value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poolState],
  );

  return (
    <WebViewPoolContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        {poolState.instances.map((instance) => (
          <WebViewSlot
            key={instance.id}
            instance={instance}
            layout={layoutsRef.current.get(instance.id) ?? null}
            instanceProps={propsRef.current.get(instance.id)}
            config={mergedConfig}
            onCleanupComplete={handleCleanupComplete}
          />
        ))}
      </View>
    </WebViewPoolContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default WebViewPoolProvider;
