import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { WebViewPoolProvider } from '../WebViewPoolProvider';
import { usePooledWebView } from '../usePooledWebView';
import WebViewManager from '../WebViewManager';
import type { UsePooledWebViewReturn } from '../types';

jest.mock('react-native', () => {
  const actualReact = jest.requireActual('react');
  const View = actualReact.forwardRef(({ children, ...props }: any, ref: any) =>
    actualReact.createElement('View', { ...props, ref }, children),
  );
  View.displayName = 'View';
  return {
    View,
    StyleSheet: { create: (s: any) => s },
    NativeModules: {},
    findNodeHandle: () => null,
    TurboModuleRegistry: {
      get: () => null,
      getEnforcing: () => {
        throw new Error();
      },
    },
  };
});

jest.mock('react-native-webview', () => {
  const actualReact = jest.requireActual('react');
  const WebView = actualReact.forwardRef((props: any, ref: any) =>
    actualReact.createElement('WebView', { ...props, ref }),
  );
  WebView.displayName = 'WebView';
  return { WebView };
});

// Helper component to capture the hook return value
function HookConsumer({ onHook }: { onHook: (hook: UsePooledWebViewReturn) => void }) {
  const hook = usePooledWebView();
  onHook(hook);
  return null;
}

describe('usePooledWebView', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should return borrow/release functions and null instanceId initially', () => {
    let hookValue: UsePooledWebViewReturn | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    expect(hookValue).toBeDefined();
    expect(typeof hookValue!.borrow).toBe('function');
    expect(typeof hookValue!.release).toBe('function');
    expect(hookValue!.instanceId).toBeNull();
    expect(hookValue!.webViewRef).toBeNull();
  });

  it('should borrow an instance with instanceId', () => {
    let hookValue: UsePooledWebViewReturn | undefined;
    let borrowResult: any;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    act(() => {
      borrowResult = hookValue!.borrow();
    });

    expect(borrowResult).not.toBeNull();
    expect(borrowResult!.instanceId).toBeDefined();
    expect(borrowResult!.webViewRef).toBeDefined();
    expect(hookValue!.instanceId).not.toBeNull();
  });

  it('should return null when pool is exhausted', () => {
    let hook1: UsePooledWebViewReturn | undefined;
    let hook2: UsePooledWebViewReturn | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 1 }}>
          <HookConsumer onHook={(h) => { hook1 = h; }} />
          <HookConsumer onHook={(h) => { hook2 = h; }} />
        </WebViewPoolProvider>,
      );
    });

    act(() => {
      hook1!.borrow();
    });

    let result: any;
    act(() => {
      result = hook2!.borrow();
    });

    expect(result).toBeNull();
  });

  it('should release on unmount', () => {
    let hookValue: UsePooledWebViewReturn | undefined;
    let renderer: ReactTestRenderer;
    let borrowResult: any;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2, cleanupOnReturn: false }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    act(() => {
      borrowResult = hookValue!.borrow();
    });

    expect(borrowResult).not.toBeNull();
    expect(hookValue!.instanceId).not.toBeNull();

    act(() => {
      renderer.unmount();
    });

    // After unmount, the hook's cleanup should have called release.
    // The manager should reflect that the instance is no longer borrowed.
    const mgr = WebViewManager.getInstance();
    const state = mgr.getState();
    expect(state.borrowedCount).toBe(0);
  });

  it('should release a borrowed instance manually', () => {
    let hookValue: UsePooledWebViewReturn | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2, cleanupOnReturn: false }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    act(() => {
      hookValue!.borrow();
    });

    expect(hookValue!.instanceId).not.toBeNull();

    act(() => {
      hookValue!.release();
    });

    // After release, the manager should reflect no borrowed instances
    const mgr = WebViewManager.getInstance();
    expect(mgr.getState().borrowedCount).toBe(0);
  });

  it('should be a no-op when releasing without borrowing', () => {
    let hookValue: UsePooledWebViewReturn | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    // Should not throw when releasing without borrowing
    act(() => {
      hookValue!.release();
    });

    expect(hookValue!.instanceId).toBeNull();
  });

  it('should return same instance on duplicate borrow (not consuming a second slot)', () => {
    let hookValue: UsePooledWebViewReturn | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <HookConsumer onHook={(h) => { hookValue = h; }} />
        </WebViewPoolProvider>,
      );
    });

    let result1: any;
    let result2: any;

    act(() => {
      result1 = hookValue!.borrow();
      result2 = hookValue!.borrow();
    });

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.instanceId).toBe(result2!.instanceId);
  });
});
