import React from 'react';

const View = React.forwardRef(({ children, testID, ...props }: any, ref: any) => {
  return React.createElement('View', { ...props, testID, ref }, children);
});
View.displayName = 'View';

const StyleSheet = {
  create: (styles: any) => styles,
};

const NativeModules: Record<string, any> = {};

function findNodeHandle(_ref: any): number | null {
  return null;
}

const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (_name: string) => {
    throw new Error('TurboModule not found');
  },
};

export { View, StyleSheet, NativeModules, findNodeHandle, TurboModuleRegistry };
export type ViewStyle = Record<string, any>;
export type LayoutChangeEvent = { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } };
export type TurboModule = {};
