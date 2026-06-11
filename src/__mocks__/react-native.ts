import React from 'react';

const View = React.forwardRef(({ children, testID, ...props }: any, ref: any) => {
  return React.createElement('View', { ...props, testID, ref }, children);
});
View.displayName = 'View';

const StyleSheet = {
  create: (styles: any) => styles,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

const NativeModules: Record<string, any> = {};

const Platform = { OS: 'ios' as 'ios' | 'android' };

function findNodeHandle(_ref: any): number | null {
  return null;
}

const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (_name: string) => {
    throw new Error('TurboModule not found');
  },
};

export { View, StyleSheet, NativeModules, Platform, findNodeHandle, TurboModuleRegistry };
export type ViewStyle = Record<string, any>;
export type LayoutChangeEvent = {
  nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
};
export type TurboModule = {};
