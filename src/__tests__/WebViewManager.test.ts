import WebViewManager from '../WebViewManager';

describe('WebViewManager', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should be a singleton', () => {
    const a = WebViewManager.getInstance();
    const b = WebViewManager.getInstance();
    expect(a).toBe(b);
  });

  it('should initialize with default pool size', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize();

    const state = mgr.getState();
    expect(state.initialized).toBe(true);
    expect(state.instances).toHaveLength(3);
    expect(state.availableCount).toBe(3);
    expect(state.borrowedCount).toBe(0);
  });

  it('should initialize with custom pool size', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 5 });

    const state = mgr.getState();
    expect(state.instances).toHaveLength(5);
    expect(state.availableCount).toBe(5);
  });

  it('should not re-initialize', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 2 });
    mgr.initialize({ poolSize: 5 });

    expect(mgr.getState().instances).toHaveLength(2);
  });

  describe('borrow', () => {
    it('should borrow an idle instance', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 2 });

      const result = mgr.borrow('user-1');

      expect(result).not.toBeNull();
      expect(result!.instanceId).toBe('webview-pool-0');
      expect(result!.webViewRef).toBeDefined();

      const state = mgr.getState();
      expect(state.availableCount).toBe(1);
      expect(state.borrowedCount).toBe(1);
    });

    it('should return null when pool is exhausted', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 1 });

      mgr.borrow('user-1');
      const result = mgr.borrow('user-2');

      expect(result).toBeNull();
    });

    it('should borrow multiple instances', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 3 });

      const r1 = mgr.borrow('user-1');
      const r2 = mgr.borrow('user-2');
      const r3 = mgr.borrow('user-3');

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r3).not.toBeNull();
      expect(r1!.instanceId).not.toBe(r2!.instanceId);
      expect(r2!.instanceId).not.toBe(r3!.instanceId);

      expect(mgr.getState().availableCount).toBe(0);
    });
  });

  describe('release', () => {
    it('should move instance to cleaning state with cleanupOnReturn', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 2, cleanupOnReturn: true });

      const result = mgr.borrow('user-1')!;
      mgr.release(result.instanceId);

      const inst = mgr
        .getState()
        .instances.find((i) => i.id === result.instanceId);
      expect(inst!.status).toBe('cleaning');
    });

    it('should move instance directly to idle without cleanup', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 2, cleanupOnReturn: false });

      const result = mgr.borrow('user-1')!;
      mgr.release(result.instanceId);

      const inst = mgr
        .getState()
        .instances.find((i) => i.id === result.instanceId);
      expect(inst!.status).toBe('idle');
    });

    it('should not release a non-borrowed instance', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 2 });

      mgr.release('webview-pool-0');

      expect(mgr.getState().availableCount).toBe(2);
    });
  });

  describe('markIdle', () => {
    it('should transition instance from cleaning to idle', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 2, cleanupOnReturn: true });

      const result = mgr.borrow('user-1')!;
      mgr.release(result.instanceId);
      mgr.markIdle(result.instanceId);

      const inst = mgr
        .getState()
        .instances.find((i) => i.id === result.instanceId);
      expect(inst!.status).toBe('idle');
      expect(inst!.borrowerId).toBeNull();
      expect(inst!.borrowedAt).toBeNull();
    });

    it('should allow re-borrowing after markIdle', () => {
      const mgr = WebViewManager.getInstance();
      mgr.initialize({ poolSize: 1, cleanupOnReturn: true });

      const r1 = mgr.borrow('user-1')!;
      mgr.release(r1.instanceId);
      mgr.markIdle(r1.instanceId);

      const r2 = mgr.borrow('user-2');
      expect(r2).not.toBeNull();
      expect(r2!.instanceId).toBe(r1.instanceId);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on state changes', () => {
      const mgr = WebViewManager.getInstance();
      const listener = jest.fn();

      mgr.subscribe(listener);
      mgr.initialize({ poolSize: 2 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ initialized: true }),
      );
    });

    it('should unsubscribe correctly', () => {
      const mgr = WebViewManager.getInstance();
      const listener = jest.fn();

      const unsub = mgr.subscribe(listener);
      mgr.initialize({ poolSize: 2 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      mgr.borrow('user-1');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
