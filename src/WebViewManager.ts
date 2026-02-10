import { createRef } from 'react';
import type { WebView } from 'react-native-webview';
import { DEFAULT_POOL_CONFIG } from './constants';
import type {
  PoolConfig,
  PoolState,
  PoolListener,
  WebViewInstance,
  BorrowResult,
} from './types';

class WebViewManager {
  private static instance: WebViewManager | null = null;

  private config: PoolConfig = DEFAULT_POOL_CONFIG;
  private instances: WebViewInstance[] = [];
  private listeners: Set<PoolListener> = new Set();
  private initialized = false;

  private constructor() {}

  static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  static resetInstance(): void {
    WebViewManager.instance = null;
  }

  initialize(config?: Partial<PoolConfig>): void {
    if (this.initialized) return;

    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.instances = [];

    for (let i = 0; i < this.config.poolSize; i++) {
      this.instances.push({
        id: `webview-pool-${i}`,
        status: 'idle',
        webViewRef: createRef<WebView | null>(),
        borrowerId: null,
        createdAt: Date.now(),
        borrowedAt: null,
      });
    }

    this.initialized = true;
    this.notify();
  }

  borrow(borrowerId: string): BorrowResult | null {
    const idle = this.instances.find((inst) => inst.status === 'idle');
    if (!idle) return null;

    idle.status = 'borrowed';
    idle.borrowerId = borrowerId;
    idle.borrowedAt = Date.now();
    this.notify();

    return {
      instanceId: idle.id,
      webViewRef: idle.webViewRef,
    };
  }

  release(instanceId: string): void {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst || inst.status !== 'borrowed') return;

    if (this.config.cleanupOnReturn) {
      inst.status = 'cleaning';
    } else {
      inst.status = 'idle';
      inst.borrowerId = null;
      inst.borrowedAt = null;
    }
    this.notify();
  }

  markIdle(instanceId: string): void {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) return;

    inst.status = 'idle';
    inst.borrowerId = null;
    inst.borrowedAt = null;
    this.notify();
  }

  getState(): PoolState {
    return {
      instances: [...this.instances],
      availableCount: this.instances.filter((i) => i.status === 'idle').length,
      borrowedCount: this.instances.filter((i) => i.status === 'borrowed')
        .length,
      initialized: this.initialized,
    };
  }

  getConfig(): PoolConfig {
    return { ...this.config };
  }

  subscribe(listener: PoolListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

export default WebViewManager;
