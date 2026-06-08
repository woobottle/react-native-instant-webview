import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import WebViewSlot from '../WebViewSlot';
import type { WebViewInstance, PoolConfig, InstanceLayout } from '../types';

// Force the native-module path on, and spy on the detach/attach calls.
// The real module gates these behind `hasNativeModule`, which is false in the
// default react-native mock (empty NativeModules), so the buggy path was never
// exercised by the existing suite.
jest.mock('../native/NativeViewDetachment', () => ({
  hasNativeModule: true,
  attachView: jest.fn(),
  detachView: jest.fn(),
}));

import { attachView, detachView } from '../native/NativeViewDetachment';

const attachViewMock = attachView as jest.Mock;
const detachViewMock = detachView as jest.Mock;

function makeInstance(overrides: Partial<WebViewInstance> = {}): WebViewInstance {
  return {
    id: 'webview-pool-0',
    status: 'idle',
    webViewRef: React.createRef(),
    borrowerId: null,
    createdAt: Date.now(),
    borrowedAt: null,
    warmedUrl: null,
    ...overrides,
  };
}

const DEFAULT_CONFIG: PoolConfig = { poolSize: 3, cleanupOnReturn: true };
const LAYOUT: InstanceLayout = { top: 100, left: 50, width: 300, height: 400 };

describe('WebViewSlot native detach/attach ref', () => {
  beforeEach(() => {
    attachViewMock.mockClear();
    detachViewMock.mockClear();
  });

  // Regression: react-native-webview exposes its ref as an imperative handle
  // (goForward/goBack/reload/...), NOT a host component. Passing instance.webViewRef
  // to findNodeHandle throws "Argument appears to not be a ReactComponent".
  // The slot must hand a real holder View ref to the native module instead.
  it('attaches a holder view ref, not the webview imperative ref', () => {
    const webViewRef = React.createRef<any>();
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1', webViewRef });

    act(() => {
      create(
        <WebViewSlot
          instance={instance}
          layout={LAYOUT}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    expect(attachViewMock).toHaveBeenCalled();
    const [viewRefArg, parentRefArg] = attachViewMock.mock.calls[0];
    expect(viewRefArg).not.toBe(webViewRef);
    // parent is still the slot container (a distinct ref from the holder)
    expect(parentRefArg).not.toBe(viewRefArg);
  });

  it('detaches a holder view ref, not the webview imperative ref, when idle', () => {
    const webViewRef = React.createRef<any>();
    let renderer: ReactTestRenderer;

    // Borrow first so the slot actually renders a WebView (hasWebView = true).
    act(() => {
      renderer = create(
        <WebViewSlot
          instance={makeInstance({ status: 'borrowed', borrowerId: 'b1', webViewRef })}
          layout={LAYOUT}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    detachViewMock.mockClear();

    // Return to idle -> should detach.
    act(() => {
      renderer!.update(
        <WebViewSlot
          instance={makeInstance({ status: 'idle', webViewRef })}
          layout={null}
          instanceProps={undefined}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    expect(detachViewMock).toHaveBeenCalled();
    const [viewRefArg] = detachViewMock.mock.calls[0];
    expect(viewRefArg).not.toBe(webViewRef);
  });
});
