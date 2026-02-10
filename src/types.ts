import type { RefObject } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { WebView, WebViewProps } from 'react-native-webview';

export interface PoolConfig {
  poolSize: number;
  cleanupOnReturn: boolean;
  customCleanupScript?: string;
  defaultWebViewProps?: Partial<WebViewProps>;
}

export type InstanceStatus = 'idle' | 'borrowed' | 'cleaning';

export interface WebViewInstance {
  id: string;
  status: InstanceStatus;
  webViewRef: RefObject<WebView | null>;
  borrowerId: string | null;
  createdAt: number;
  borrowedAt: number | null;
}

export interface PoolState {
  instances: WebViewInstance[];
  availableCount: number;
  borrowedCount: number;
  initialized: boolean;
}

export interface BorrowResult {
  instanceId: string;
  webViewRef: RefObject<WebView | null>;
}

export interface InstanceLayout {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface WebViewPoolContextValue {
  state: PoolState;
  borrow: (borrowerId: string) => BorrowResult | null;
  release: (instanceId: string) => void;
  setInstanceLayout: (instanceId: string, layout: InstanceLayout | null) => void;
  setInstanceProps: (instanceId: string, props: Partial<WebViewProps>) => void;
  getInstanceLayout: (instanceId: string) => InstanceLayout | null;
  getInstanceProps: (instanceId: string) => Partial<WebViewProps> | undefined;
}

export interface PooledWebViewProps extends Omit<WebViewProps, 'ref'> {
  poolKey?: string;
  containerStyle?: StyleProp<ViewStyle>;
  onPoolExhausted?: () => void;
  onBorrowed?: (instanceId: string) => void;
  onReturned?: (instanceId: string) => void;
}

export interface WebViewPoolProviderProps {
  config?: Partial<PoolConfig>;
  children: React.ReactNode;
}

export interface UsePooledWebViewReturn {
  borrow: () => BorrowResult | null;
  release: () => void;
  instanceId: string | null;
  webViewRef: RefObject<WebView | null> | null;
}

export type PoolListener = (state: PoolState) => void;
