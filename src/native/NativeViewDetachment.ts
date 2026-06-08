import { NativeModules, findNodeHandle } from 'react-native';
import type { RefObject } from 'react';

const NativeModule = NativeModules.InstantWebView;

/**
 * Native attach/detach reparents a view through the legacy bridge's
 * RCTUIManager view registry. Under the New Architecture this is unavailable:
 * the module's `self.bridge` is nil in bridgeless mode (throws
 * "unrecognized selector"), and Fabric manages its own component views that
 * RCTUIManager does not own. In that case we skip native reparenting and rely
 * on the JS positioning fallback (idle slots are hidden via HIDDEN_STYLE).
 */
export function isNewArchitecture(): boolean {
  const g = global as {
    RN$Bridgeless?: boolean;
    nativeFabricUIManager?: unknown;
  };
  return g.RN$Bridgeless === true || g.nativeFabricUIManager != null;
}

export const hasNativeModule = NativeModule != null && !isNewArchitecture();

export function detachView(ref: RefObject<any>): void {
  const tag = findNodeHandle(ref.current);
  if (tag && NativeModule) {
    NativeModule.detachView(tag);
  }
}

export function attachView(ref: RefObject<any>, parentRef: RefObject<any>): void {
  const tag = findNodeHandle(ref.current);
  const parentTag = findNodeHandle(parentRef.current);
  if (tag && parentTag && NativeModule) {
    NativeModule.attachView(tag, parentTag);
  }
}
