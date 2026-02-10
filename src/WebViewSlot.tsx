import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { BLANK_HTML_SOURCE, CLEANUP_SCRIPT, HIDDEN_STYLE } from './constants';
import type { InstanceLayout, PoolConfig, WebViewInstance } from './types';
import type { WebViewProps } from 'react-native-webview';

interface WebViewSlotProps {
  instance: WebViewInstance;
  layout: InstanceLayout | null;
  instanceProps: Partial<WebViewProps> | undefined;
  config: PoolConfig;
  onCleanupComplete: (instanceId: string) => void;
}

const WebViewSlot: React.FC<WebViewSlotProps> = ({
  instance,
  layout,
  instanceProps,
  config,
  onCleanupComplete,
}) => {
  const isVisible = instance.status === 'borrowed' && layout != null;
  const prevStatusRef = useRef(instance.status);

  // Track whether this slot has ever had a WebView rendered.
  // On first borrow the WebView is created with a valid user source,
  // avoiding the Fabric crash where didMoveToWindow fires before
  // the source prop is applied (causing loadFileURL: with nil URL).
  // After the first borrow, the WebView stays alive through
  // cleaning → idle cycles.
  const [hasWebView, setHasWebView] = useState(false);

  useEffect(() => {
    if (instance.status === 'borrowed' && !hasWebView) {
      setHasWebView(true);
    }
  }, [instance.status, hasWebView]);

  // When entering cleaning state, inject cleanup script then mark idle
  useEffect(() => {
    if (prevStatusRef.current !== 'cleaning' && instance.status === 'cleaning') {
      const ref = instance.webViewRef.current;
      if (ref) {
        const script = config.customCleanupScript ?? CLEANUP_SCRIPT;
        ref.injectJavaScript(script);
      }
      const timer = setTimeout(() => {
        onCleanupComplete(instance.id);
      }, 100);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = instance.status;
  }, [instance.status, instance.id, instance.webViewRef, config.customCleanupScript, onCleanupComplete]);

  const containerStyle = useMemo<ViewStyle>(() => {
    if (!isVisible || !layout) {
      return HIDDEN_STYLE;
    }
    return {
      position: 'absolute',
      top: layout.top,
      left: layout.left,
      width: layout.width,
      height: layout.height,
    };
  }, [isVisible, layout]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      instanceProps?.onNavigationStateChange?.(navState);
    },
    [instanceProps],
  );

  const source = useMemo(() => {
    if (instance.status === 'borrowed' && instanceProps?.source) {
      return instanceProps.source;
    }
    return BLANK_HTML_SOURCE;
  }, [instance.status, instanceProps?.source]);

  // Don't render WebView until the first borrow.
  // This avoids the Fabric crash where didMoveToWindow → visitSource
  // fires before _source prop is applied on the native side.
  const shouldRenderWebView = hasWebView;

  return (
    <View
      style={containerStyle}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {shouldRenderWebView && (
        <WebView
          ref={instance.webViewRef as React.RefObject<WebView>}
          {...(instance.status === 'borrowed' ? instanceProps : undefined)}
          source={source}
          onNavigationStateChange={handleNavigationStateChange}
          style={{ flex: 1 }}
          {...(config.defaultWebViewProps || {})}
        />
      )}
    </View>
  );
};

export default React.memo(WebViewSlot);
