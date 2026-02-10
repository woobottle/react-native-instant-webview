import type { ViewStyle } from 'react-native';
import type { PoolConfig } from './types';

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  poolSize: 3,
  cleanupOnReturn: true,
};

export const HIDDEN_STYLE: ViewStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  left: -9999,
  top: -9999,
  opacity: 0,
};

// Blank HTML source used for idle/cleaning WebViews.
// Using { html } instead of { uri: 'about:blank' } because
// react-native-webview's native code may route 'about:blank'
// through loadFileURL: which throws NSInvalidArgumentException.
export const BLANK_HTML_SOURCE = { html: '' } as const;

// Cleanup script injected into WebView when returning to pool.
// Resets scroll position, clears timers, and removes all body content.
// The body.innerHTML = '' is intentional — it clears the WebView DOM
// as part of the pool cleanup process (no user content involved).
export const CLEANUP_SCRIPT = `
(function() {
  try {
    window.scrollTo(0, 0);
    var highestTimeoutId = setTimeout(function(){}, 0);
    for (var i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
    var highestIntervalId = setInterval(function(){}, 0);
    for (var j = 0; j < highestIntervalId; j++) {
      clearInterval(j);
    }
    if (document.body) {
      document.body.innerHTML = '';
    }
  } catch(e) {}
  true;
})();
`;
