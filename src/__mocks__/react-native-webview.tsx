import React from 'react';

const WebView = React.forwardRef((props: any, ref: any) => {
  return React.createElement('WebView', { ...props, testID: props.testID ?? 'mock-webview', ref });
});
WebView.displayName = 'WebView';

export { WebView };
export type WebViewProps = Record<string, any>;
export type WebViewNavigation = {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
};
