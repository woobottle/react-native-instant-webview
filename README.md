# react-native-instant-webview

WebView pooling library for React Native. Keeps WebView instances alive across screen transitions so users never see a loading spinner twice.

## How It Works

```
[WebViewPoolProvider] ─── children (your app)
       |
       └── WebViewSlot[0]  (hidden or positioned)
       └── WebViewSlot[1]
       └── WebViewSlot[2]

[PooledWebView] ─── placeholder View
       |              borrow() → slot moves to placeholder position
       └── unmount → release() → cleanup → idle
```

WebView instances live at the Provider root with absolute positioning. When a `PooledWebView` mounts, it borrows an idle instance and positions it over the placeholder using `measureInWindow`. On unmount, the instance is cleaned up and returned to the pool — the underlying WKWebView/Android WebView is never destroyed.

## Installation

```bash
npm install react-native-instant-webview
```

### Peer Dependencies

```bash
npm install react react-native react-native-webview
```

| Dependency | Version |
|---|---|
| react | >= 18.0.0 |
| react-native | >= 0.70.0 |
| react-native-webview | >= 13.0.0 |

## Quick Start

Wrap your app with `WebViewPoolProvider` and use `PooledWebView` as a drop-in replacement for `WebView`:

```tsx
import { WebViewPoolProvider, PooledWebView } from 'react-native-instant-webview';

function App() {
  return (
    <WebViewPoolProvider config={{ poolSize: 3 }}>
      <Navigation />
    </WebViewPoolProvider>
  );
}

function DetailScreen({ url }: { url: string }) {
  return (
    <View style={{ flex: 1 }}>
      <PooledWebView
        source={{ uri: url }}
        containerStyle={StyleSheet.absoluteFill}
        onPoolExhausted={() => console.warn('Pool exhausted')}
      />
    </View>
  );
}
```

When the pool is exhausted, `PooledWebView` automatically falls back to a regular `WebView` so the user always sees content.

## API

### `<WebViewPoolProvider>`

Wrap your app root. Initializes the pool and renders hidden WebView slots.

```tsx
<WebViewPoolProvider config={{ poolSize: 3, cleanupOnReturn: true }}>
  <App />
</WebViewPoolProvider>
```

#### Config

| Prop | Type | Default | Description |
|---|---|---|---|
| `poolSize` | `number` | `3` | Number of WebView instances to keep in the pool |
| `cleanupOnReturn` | `boolean` | `true` | Run cleanup script when returning to pool |
| `customCleanupScript` | `string` | built-in | Custom JS to run during cleanup |
| `defaultWebViewProps` | `Partial<WebViewProps>` | — | Default props applied to all pooled WebViews |

### `<PooledWebView>`

Drop-in replacement for `<WebView>`. Accepts all `WebViewProps` plus:

| Prop | Type | Description |
|---|---|---|
| `containerStyle` | `StyleProp<ViewStyle>` | Style for the placeholder container |
| `poolKey` | `string` | Stable identifier for the borrower |
| `onPoolExhausted` | `() => void` | Called when no idle instances are available |
| `onBorrowed` | `(instanceId: string) => void` | Called when an instance is borrowed |
| `onReturned` | `(instanceId: string) => void` | Called when an instance is returned |

```tsx
<PooledWebView
  source={{ uri: 'https://example.com' }}
  containerStyle={StyleSheet.absoluteFill}
  onLoadEnd={() => setLoading(false)}
  onBorrowed={(id) => console.log('Borrowed:', id)}
  onReturned={(id) => console.log('Returned:', id)}
  onPoolExhausted={() => console.warn('Falling back to regular WebView')}
/>
```

### `usePooledWebView()`

Imperative hook for manual borrow/release control.

```tsx
function MyComponent() {
  const { borrow, release, instanceId, webViewRef } = usePooledWebView();

  useEffect(() => {
    const result = borrow();
    if (result) {
      // Use result.webViewRef to interact with the WebView
    }
    return () => release();
  }, []);
}
```

### `useWebViewPool()`

Access the pool context directly for advanced use cases.

```tsx
const { state, borrow, release } = useWebViewPool();
console.log(state.availableCount, state.borrowedCount);
```

## Pool Lifecycle

```
idle ──borrow()──> borrowed ──release()──> cleaning ──done──> idle
                      │                                         │
                      │         WebView stays alive             │
                      └─────────────────────────────────────────┘
```

1. **idle** — Instance is available. WebView is hidden (1x1px at -9999).
2. **borrowed** — Instance is positioned over the `PooledWebView` placeholder.
3. **cleaning** — Cleanup script runs (scroll reset, timer cleanup, DOM clear), then returns to idle.

On the first borrow of each slot, the WebView is lazily created to avoid a [Fabric crash](https://github.com/react-native-webview/react-native-webview/issues) where `didMoveToWindow` fires before the `source` prop is applied.

## Example

See [`example/bare/App.tsx`](example/bare/App.tsx) for a full navigation example comparing pooled vs normal WebViews side by side.

## Development

```bash
npm install
npm run typecheck    # TypeScript check
npm test             # Run tests (20 tests)
npm run build        # Build with react-native-builder-bob
```

## License

MIT
