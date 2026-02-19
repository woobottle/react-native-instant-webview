import { NativeModules, findNodeHandle } from 'react-native';
import type { RefObject } from 'react';

const NativeModule = NativeModules.InstantWebView;

export const hasNativeModule = NativeModule != null;

export function detachView(ref: RefObject<any>): void {
  const tag = findNodeHandle(ref.current);
  if (tag && NativeModule) {
    NativeModule.detachView(tag);
  }
}

export function attachView(
  ref: RefObject<any>,
  parentRef: RefObject<any>,
): void {
  const tag = findNodeHandle(ref.current);
  const parentTag = findNodeHandle(parentRef.current);
  if (tag && parentTag && NativeModule) {
    NativeModule.attachView(tag, parentTag);
  }
}
