import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { WebViewPoolProvider } from '../WebViewPoolProvider';
import { useWarmUp } from '../useWarmUp';
import WebViewManager from '../WebViewManager';
import type { WarmUpHandle } from '../types';

describe('useWarmUp', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  afterEach(() => {
    act(() => {
      renderer?.unmount();
    });
  });

  it('should return a WarmUpHandle with url and instanceId', () => {
    let handle: WarmUpHandle | null = null;

    function TestComponent() {
      const { warmUp } = useWarmUp();
      React.useEffect(() => {
        handle = warmUp('https://example.com');
      }, [warmUp]);
      return null;
    }

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <TestComponent />
        </WebViewPoolProvider>,
      );
    });

    expect(handle).not.toBeNull();
    expect(handle!.url).toBe('https://example.com');
    expect(handle!.instanceId).toBe('webview-pool-0');
    expect(typeof handle!.cancel).toBe('function');
  });

  it('should return instance to idle after cancelWarmUp', () => {
    function TestComponent() {
      const { warmUp, cancelWarmUp } = useWarmUp();
      React.useEffect(() => {
        warmUp('https://example.com');
        // Cancel immediately
        cancelWarmUp('https://example.com');
      }, [warmUp, cancelWarmUp]);
      return null;
    }

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2, cleanupOnReturn: false }}>
          <TestComponent />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    // With cleanupOnReturn=false, cancel should set it back to idle directly
    const warmingCount = state.instances.filter(
      (i) => i.status === 'warming',
    ).length;
    expect(warmingCount).toBe(0);
    expect(state.availableCount).toBe(2);
  });

  it('should return null when pool is exhausted', () => {
    let handle: WarmUpHandle | null | undefined;

    function TestComponent() {
      const { warmUp } = useWarmUp();
      React.useEffect(() => {
        // Warm up all available instances
        warmUp('https://a.com');
        handle = warmUp('https://b.com');
      }, [warmUp]);
      return null;
    }

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 1 }}>
          <TestComponent />
        </WebViewPoolProvider>,
      );
    });

    // Second warmUp should return null since pool is exhausted
    expect(handle).toBeNull();
  });
});
