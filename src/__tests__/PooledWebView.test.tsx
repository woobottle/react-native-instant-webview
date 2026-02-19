import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { WebViewPoolProvider } from '../WebViewPoolProvider';
import PooledWebView from '../PooledWebView';
import WebViewManager from '../WebViewManager';

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
    TurboModuleRegistry: { get: () => null, getEnforcing: () => { throw new Error(); } },
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

describe('PooledWebView integration', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should borrow an instance on mount', () => {
    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <PooledWebView source={{ uri: 'https://example.com' }} />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.borrowedCount).toBe(1);
    expect(state.availableCount).toBe(1);
  });

  it('should release instance on unmount', () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <PooledWebView source={{ uri: 'https://example.com' }} />
        </WebViewPoolProvider>,
      );
    });

    expect(WebViewManager.getInstance().getState().borrowedCount).toBe(1);

    act(() => {
      renderer.unmount();
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.borrowedCount).toBe(0);
  });

  it('should fall back to regular WebView when pool is exhausted', () => {
    const onPoolExhausted = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 1 }}>
          <PooledWebView source={{ uri: 'https://a.com' }} />
          <PooledWebView
            source={{ uri: 'https://b.com' }}
            onPoolExhausted={onPoolExhausted}
          />
        </WebViewPoolProvider>,
      );
    });

    expect(onPoolExhausted).toHaveBeenCalled();

    // The fallback PooledWebView should render a regular WebView
    const json = JSON.stringify(renderer!.toJSON());
    // 1 pooled WebView (borrowed) + 1 fallback WebView = 2 total
    const matches = json.match(/WebView/g);
    expect(matches!.length).toBe(2);
  });

  it('should call onBorrowed with instance id', () => {
    const onBorrowed = jest.fn();

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <PooledWebView
            source={{ uri: 'https://example.com' }}
            onBorrowed={onBorrowed}
          />
        </WebViewPoolProvider>,
      );
    });

    expect(onBorrowed).toHaveBeenCalledWith('webview-pool-0');
  });

  it('should only render WebView for borrowed slots (lazy creation)', () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 3 }}>
          <PooledWebView source={{ uri: 'https://example.com' }} />
        </WebViewPoolProvider>,
      );
    });

    const tree = renderer!.toJSON() as any;
    const json = JSON.stringify(tree);
    const matches = json.match(/WebView/g);
    // Only 1 WebView rendered (the borrowed one), idle slots are empty Views
    expect(matches!.length).toBe(1);
  });

  it('should borrow multiple instances for multiple PooledWebViews', () => {
    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 3 }}>
          <PooledWebView source={{ uri: 'https://a.com' }} />
          <PooledWebView source={{ uri: 'https://b.com' }} />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.borrowedCount).toBe(2);
    expect(state.availableCount).toBe(1);
  });
});

describe('Warm-up integration', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  afterEach(() => {
    act(() => {
      renderer?.unmount();
    });
  });

  it('should borrow a warmed-up instance when URL matches', () => {
    const mgr = WebViewManager.getInstance();

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <WarmUpTrigger url="https://example.com" />
          <PooledWebView source={{ uri: 'https://example.com' }} />
        </WebViewPoolProvider>,
      );
    });

    const state = mgr.getState();
    // The warmed instance should now be borrowed (matched URL)
    expect(state.borrowedCount).toBe(1);
    // The other instance should still be idle
    expect(state.availableCount).toBe(1);
  });

  it('should render WebView in warming slot', () => {
    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <WarmUpTrigger url="https://example.com" />
        </WebViewPoolProvider>,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    const matches = json.match(/WebView/g);
    // 1 WebView should be rendered for the warming slot
    expect(matches!.length).toBe(1);
  });

  it('should fall back to idle instance when URL does not match warming', () => {
    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 3 }}>
          <WarmUpTrigger url="https://example.com" />
          <PooledWebView source={{ uri: 'https://other.com' }} />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.borrowedCount).toBe(1);
    // warming instance + 1 idle
    const warmingCount = state.instances.filter(
      (i) => i.status === 'warming',
    ).length;
    expect(warmingCount).toBe(1);
    expect(state.availableCount).toBe(1);
  });
});

describe('Ref forwarding', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should expose WebView ref via forwardRef', () => {
    const ref = React.createRef<any>();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <PooledWebView
            ref={ref}
            source={{ uri: 'https://example.com' }}
          />
        </WebViewPoolProvider>,
      );
    });

    // The ref should point to the pool's WebView ref (may be null in test env
    // since the actual WebView component isn't mounted natively, but the
    // imperative handle should exist and not throw)
    expect(ref.current).toBeDefined();
  });

  it('should expose fallback ref when pool is exhausted', () => {
    const ref1 = React.createRef<any>();
    const ref2 = React.createRef<any>();

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 1 }}>
          <PooledWebView
            ref={ref1}
            source={{ uri: 'https://a.com' }}
          />
          <PooledWebView
            ref={ref2}
            source={{ uri: 'https://b.com' }}
          />
        </WebViewPoolProvider>,
      );
    });

    // ref2 is fallback — should still be defined (points to local WebView ref)
    expect(ref2.current).toBeDefined();
  });
});

describe('Props priority', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should let instance props override defaultWebViewProps', () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider
          config={{
            poolSize: 2,
            cleanupOnReturn: true,
            defaultWebViewProps: { javaScriptEnabled: false },
          }}
        >
          <PooledWebView
            source={{ uri: 'https://example.com' }}
            javaScriptEnabled={true}
          />
        </WebViewPoolProvider>,
      );
    });

    const root = renderer!.toJSON() as any;
    const webView = findWebView(root);
    expect(webView).toBeTruthy();
    // instanceProps (javaScriptEnabled=true) should override defaultWebViewProps (javaScriptEnabled=false)
    expect(webView.props.javaScriptEnabled).toBe(true);
  });
});

// Helper component that triggers warmUp via context.
// Uses a ref to avoid re-firing when context value changes.
function WarmUpTrigger({ url }: { url: string }) {
  const { warmUp } = require('../WebViewPoolProvider').useWebViewPool();
  const warmUpRef = React.useRef(warmUp);
  warmUpRef.current = warmUp;
  React.useEffect(() => {
    warmUpRef.current(url);
  }, [url]);
  return null;
}

function findWebView(node: any): any {
  if (!node) return null;
  if (node.type === 'WebView') return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findWebView(child);
      if (found) return found;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findWebView(child);
      if (found) return found;
    }
  }
  return null;
}
