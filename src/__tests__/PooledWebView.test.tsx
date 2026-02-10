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

  it('should call onPoolExhausted when pool is empty', () => {
    const onPoolExhausted = jest.fn();

    act(() => {
      create(
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
