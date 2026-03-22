import React from 'react';

const injectJavaScriptMock = jest.fn();

const WebView = React.forwardRef((props: any, ref: any) => {
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: injectJavaScriptMock,
    reload: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    stopLoading: jest.fn(),
  }));
  return React.createElement('WebView', { ...props, testID: props.testID ?? 'mock-webview' });
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
