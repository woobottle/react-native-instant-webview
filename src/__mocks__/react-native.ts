import React from 'react';

const View = React.forwardRef(({ children, testID, ...props }: any, ref: any) => {
  return React.createElement('View', { ...props, testID, ref }, children);
});
View.displayName = 'View';

const StyleSheet = {
  create: (styles: any) => styles,
};

export { View, StyleSheet };
export type ViewStyle = Record<string, any>;
export type LayoutChangeEvent = { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } };
