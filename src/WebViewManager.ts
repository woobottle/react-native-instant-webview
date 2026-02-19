import { createRef } from 'react';
import type { WebView } from 'react-native-webview';
import { DEFAULT_POOL_CONFIG, DEFAULT_WARMUP_TIMEOUT } from './constants';
import type {
  PoolConfig,
  PoolState,
  PoolListener,
  WebViewInstance,
  BorrowResult,
  WarmUpOptions,
  WarmUpHandle,
} from './types';

interface WarmUpEntry {
  url: string;
  instanceId: string;
  timer: ReturnType<typeof setTimeout>;
}

class WebViewManager {
  private static instance: WebViewManager | null = null;

  private config: PoolConfig = DEFAULT_POOL_CONFIG;
  private instances: WebViewInstance[] = [];
  private listeners: Set<PoolListener> = new Set();
  private initialized = false;
  private warmUpEntries: Map<string, WarmUpEntry> = new Map();

  private constructor() {}

  static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  static resetInstance(): void {
    if (WebViewManager.instance) {
      WebViewManager.instance.cancelAllWarmUps();
    }
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
        warmedUrl: null,
      });
    }

    this.initialized = true;
    this.notify();
  }

  borrow(borrowerId: string, url?: string): BorrowResult | null {
    // If a URL is provided, try to find a warming instance with matching URL first
    if (url) {
      const warming = this.instances.find(
        (inst) => inst.status === 'warming' && inst.warmedUrl === url,
      );
      if (warming) {
        // Cancel the warm-up timer
        const entry = this.warmUpEntries.get(url);
        if (entry) {
          clearTimeout(entry.timer);
          this.warmUpEntries.delete(url);
        }

        warming.status = 'borrowed';
        warming.borrowerId = borrowerId;
        warming.borrowedAt = Date.now();
        // Keep warmedUrl so WebViewSlot knows not to reload
        this.notify();

        return {
          instanceId: warming.id,
          webViewRef: warming.webViewRef,
        };
      }
    }

    // Fall back to idle instance
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

    inst.warmedUrl = null;

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
    inst.warmedUrl = null;
    this.notify();
  }

  warmUp(url: string, options?: WarmUpOptions): WarmUpHandle | null {
    // Don't warm up if already warming for this URL
    if (this.warmUpEntries.has(url)) {
      const existing = this.warmUpEntries.get(url)!;
      return {
        url,
        instanceId: existing.instanceId,
        cancel: () => this.cancelWarmUp(url),
      };
    }

    const idle = this.instances.find((inst) => inst.status === 'idle');
    if (!idle) return null;

    const timeout = options?.timeout ?? DEFAULT_WARMUP_TIMEOUT;

    idle.status = 'warming';
    idle.warmedUrl = url;

    const timer = setTimeout(() => {
      this.cancelWarmUp(url);
    }, timeout);

    this.warmUpEntries.set(url, {
      url,
      instanceId: idle.id,
      timer,
    });

    this.notify();

    return {
      url,
      instanceId: idle.id,
      cancel: () => this.cancelWarmUp(url),
    };
  }

  cancelWarmUp(url: string): void {
    const entry = this.warmUpEntries.get(url);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.warmUpEntries.delete(url);

    const inst = this.instances.find((i) => i.id === entry.instanceId);
    if (!inst || inst.status !== 'warming') return;

    if (this.config.cleanupOnReturn) {
      inst.status = 'cleaning';
      inst.warmedUrl = null;
    } else {
      inst.status = 'idle';
      inst.warmedUrl = null;
      inst.borrowerId = null;
      inst.borrowedAt = null;
    }
    this.notify();
  }

  cancelAllWarmUps(): void {
    const urls = Array.from(this.warmUpEntries.keys());
    for (const url of urls) {
      this.cancelWarmUp(url);
    }
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
