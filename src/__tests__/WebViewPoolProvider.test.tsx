import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { WebViewPoolProvider, useWebViewPool } from '../WebViewPoolProvider';
import WebViewManager from '../WebViewManager';
import type { WebViewPoolContextValue } from '../types';

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

function ContextConsumer({ onContext }: { onContext: (ctx: WebViewPoolContextValue) => void }) {
  const ctx = useWebViewPool();
  onContext(ctx);
  return null;
}

describe('WebViewPoolProvider', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should initialize pool with given config (poolSize: 5)', () => {
    let ctxValue: WebViewPoolContextValue | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 5 }}>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    expect(ctxValue).toBeDefined();
    expect(ctxValue!.state.initialized).toBe(true);
    expect(ctxValue!.state.instances).toHaveLength(5);
    expect(ctxValue!.state.availableCount).toBe(5);
    expect(ctxValue!.state.borrowedCount).toBe(0);
  });

  it('should provide context to children with all context fields', () => {
    let ctxValue: WebViewPoolContextValue | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    expect(ctxValue).toBeDefined();
    expect(ctxValue!.state).toBeDefined();
    expect(typeof ctxValue!.borrow).toBe('function');
    expect(typeof ctxValue!.release).toBe('function');
    expect(typeof ctxValue!.warmUp).toBe('function');
    expect(typeof ctxValue!.cancelWarmUp).toBe('function');
  });

  it('should throw when useWebViewPool is used outside provider', () => {
    function BadComponent() {
      useWebViewPool();
      return null;
    }

    expect(() => {
      act(() => {
        create(<BadComponent />);
      });
    }).toThrow('useWebViewPool must be used within a WebViewPoolProvider');
  });

  it('should use default config when none provided (poolSize defaults to 3)', () => {
    let ctxValue: WebViewPoolContextValue | undefined;

    act(() => {
      create(
        <WebViewPoolProvider>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    expect(ctxValue).toBeDefined();
    expect(ctxValue!.state.instances).toHaveLength(3);
    expect(ctxValue!.state.availableCount).toBe(3);
  });

  it('should get/set instance layout and props', () => {
    let ctxValue: WebViewPoolContextValue | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    // Borrow an instance first
    let borrowResult: any;
    act(() => {
      borrowResult = ctxValue!.borrow('test-borrower');
    });

    const instanceId = borrowResult!.instanceId;

    // Set and get layout
    act(() => {
      ctxValue!.setInstanceLayout(instanceId, { top: 10, left: 20, width: 100, height: 200 });
    });

    expect(ctxValue!.getInstanceLayout(instanceId)).toEqual({
      top: 10, left: 20, width: 100, height: 200,
    });

    // Set and get props
    act(() => {
      ctxValue!.setInstanceProps(instanceId, { source: { uri: 'https://test.com' } });
    });

    expect(ctxValue!.getInstanceProps(instanceId)).toEqual({
      source: { uri: 'https://test.com' },
    });

    // Get layout/props for non-existent instance
    expect(ctxValue!.getInstanceLayout('non-existent')).toBeNull();
    expect(ctxValue!.getInstanceProps('non-existent')).toBeUndefined();
  });

  it('should get WebView ref for an instance', () => {
    let ctxValue: WebViewPoolContextValue | undefined;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    // getWebViewRef for non-existent returns null
    expect(ctxValue!.getWebViewRef('non-existent')).toBeNull();

    // Borrow and check ref (will be null in test env but should not throw)
    let borrowResult: any;
    act(() => {
      borrowResult = ctxValue!.borrow('test-borrower');
    });

    const ref = ctxValue!.getWebViewRef(borrowResult!.instanceId);
    // In test environment, the ref.current will be null
    expect(ref).toBeNull();
  });

  it('should cancel warm-ups on unmount', () => {
    let ctxValue: WebViewPoolContextValue | undefined;
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 3 }}>
          <ContextConsumer onContext={(ctx) => { ctxValue = ctx; }} />
        </WebViewPoolProvider>,
      );
    });

    // Warm up a URL
    act(() => {
      ctxValue!.warmUp('https://example.com');
    });

    const mgr = WebViewManager.getInstance();
    const cancelAllSpy = jest.spyOn(mgr, 'cancelAllWarmUps');

    act(() => {
      renderer.unmount();
    });

    expect(cancelAllSpy).toHaveBeenCalled();
    cancelAllSpy.mockRestore();
  });
});
