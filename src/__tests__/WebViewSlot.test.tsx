import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import WebViewSlot from '../WebViewSlot';
import type { WebViewInstance, PoolConfig, InstanceLayout } from '../types';
import { HIDDEN_STYLE } from '../constants';

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

const DEFAULT_CONFIG: PoolConfig = {
  poolSize: 3,
  cleanupOnReturn: true,
};

const LAYOUT: InstanceLayout = { top: 100, left: 50, width: 300, height: 400 };

describe('WebViewSlot', () => {
  it('should not render WebView when idle (hasWebView = false)', () => {
    const instance = makeInstance({ status: 'idle' });
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={null}
          instanceProps={undefined}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).not.toContain('WebView');
  });

  it('should render WebView when borrowed', () => {
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1' });
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={LAYOUT}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('WebView');
  });

  it('should render WebView when warming', () => {
    const instance = makeInstance({
      status: 'warming',
      warmedUrl: 'https://warm.com',
    });
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={null}
          instanceProps={undefined}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('WebView');
  });

  it('should keep WebView alive through cleaning -> idle', () => {
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1' });
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={LAYOUT}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    // Transition to cleaning
    const cleaningInstance = makeInstance({ status: 'cleaning' });
    act(() => {
      renderer!.update(
        <WebViewSlot
          instance={cleaningInstance}
          layout={null}
          instanceProps={undefined}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    let json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('WebView');

    // Transition to idle — WebView should still exist
    const idleInstance = makeInstance({ status: 'idle' });
    act(() => {
      renderer!.update(
        <WebViewSlot
          instance={idleInstance}
          layout={null}
          instanceProps={undefined}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    json = JSON.stringify(renderer!.toJSON());
    expect(json).toContain('WebView');
  });

  it('should use HIDDEN_STYLE when not visible', () => {
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1' });
    let renderer: ReactTestRenderer;

    // borrowed but no layout -> not visible
    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={null}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const tree = renderer!.toJSON() as any;
    expect(tree.props.style).toEqual(HIDDEN_STYLE);
  });

  it('should use positioned style when visible', () => {
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1' });
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={LAYOUT}
          instanceProps={{ source: { uri: 'https://example.com' } }}
          config={DEFAULT_CONFIG}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const tree = renderer!.toJSON() as any;
    expect(tree.props.style).toEqual({
      position: 'absolute',
      top: LAYOUT.top,
      left: LAYOUT.left,
      width: LAYOUT.width,
      height: LAYOUT.height,
    });
  });

  it('should let instanceProps override defaultWebViewProps', () => {
    const instance = makeInstance({ status: 'borrowed', borrowerId: 'b1' });
    const configWithDefaults: PoolConfig = {
      ...DEFAULT_CONFIG,
      defaultWebViewProps: {
        javaScriptEnabled: false,
        mediaPlaybackRequiresUserAction: true,
      },
    };
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewSlot
          instance={instance}
          layout={LAYOUT}
          instanceProps={{
            source: { uri: 'https://example.com' },
            javaScriptEnabled: true,
          }}
          config={configWithDefaults}
          onCleanupComplete={jest.fn()}
        />,
      );
    });

    const tree = renderer!.toJSON() as any;
    // Find the WebView element
    const webView = findWebView(tree);
    expect(webView).toBeTruthy();
    // instanceProps javaScriptEnabled=true should override defaultWebViewProps javaScriptEnabled=false
    expect(webView.props.javaScriptEnabled).toBe(true);
    // defaultWebViewProps that aren't overridden should still be present
    expect(webView.props.mediaPlaybackRequiresUserAction).toBe(true);
  });
});

function findWebView(node: any): any {
  if (!node) return null;
  if (node.type === 'WebView') return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findWebView(child);
      if (found) return found;
    }
  }
  return null;
}
