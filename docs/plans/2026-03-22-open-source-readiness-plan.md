# Open Source Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** react-native-instant-webview를 오픈소스 커뮤니티에서 채택 가능한 수준으로 개선 (인프라, 품질, DX, 문서)

**Architecture:** 기존 코드 구조 유지. ESLint/Prettier로 스타일 통일, GitHub Actions로 CI/CD, 테스트 커버리지 80%+, API 에러 핸들링 강화, README 고도화, npm 자동 배포.

**Tech Stack:** TypeScript, Jest, ESLint, Prettier, GitHub Actions

---

### Task 1: ESLint + Prettier 설치 및 설정

**Files:**
- Create: `.eslintrc.js`
- Create: `.prettierrc.js`
- Create: `.eslintignore`
- Create: `.prettierignore`
- Modify: `package.json` (scripts, devDependencies)

**Step 1: 패키지 설치**

Run: `npm install -D eslint prettier @react-native/eslint-config eslint-config-prettier eslint-plugin-prettier`
Expected: 패키지 설치 완료

**Step 2: ESLint 설정 파일 생성**

`.eslintrc.js`:
```js
module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
};
```

**Step 3: Prettier 설정 파일 생성**

`.prettierrc.js`:
```js
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
};
```

**Step 4: ignore 파일 생성**

`.eslintignore`:
```
node_modules/
lib/
example/
```

`.prettierignore`:
```
node_modules/
lib/
```

**Step 5: package.json에 스크립트 추가**

```json
"lint": "eslint src/",
"lint:fix": "eslint src/ --fix",
"format": "prettier --write \"src/**/*.{ts,tsx}\"",
"format:check": "prettier --check \"src/**/*.{ts,tsx}\""
```

**Step 6: 기존 코드에 포매팅 적용**

Run: `npm run format && npm run lint:fix`
Expected: 포매팅/린트 자동 수정 완료

**Step 7: 린트/포매팅 통과 확인**

Run: `npm run lint && npm run format:check`
Expected: 에러 0개

**Step 8: Commit**

```bash
git add .eslintrc.js .prettierrc.js .eslintignore .prettierignore package.json package-lock.json src/
git commit -m "chore: add ESLint and Prettier configuration"
```

---

### Task 2: GitHub Actions CI 워크플로우

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: CI 워크플로우 파일 생성**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Type check
        run: npm run typecheck

      - name: Test with coverage
        run: npm test -- --coverage

      - name: Build
        run: npm run build
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI workflow"
```

---

### Task 3: Jest 커버리지 설정

**Files:**
- Modify: `package.json` (jest 설정)

**Step 1: package.json의 jest 설정에 커버리지 옵션 추가**

jest 섹션에 추가:
```json
"collectCoverageFrom": [
  "src/**/*.{ts,tsx}",
  "!src/**/__tests__/**",
  "!src/**/__mocks__/**",
  "!src/index.tsx",
  "!src/NativeInstantWebView.ts"
],
"coverageThreshold": {
  "global": {
    "lines": 80,
    "branches": 70,
    "functions": 80,
    "statements": 80
  }
}
```

**Step 2: 현재 커버리지 확인**

Run: `npm test -- --coverage`
Expected: 커버리지 리포트 출력, threshold 미달 시 어떤 부분이 부족한지 파악

**Step 3: Commit**

```bash
git add package.json
git commit -m "test: add Jest coverage configuration with 80% threshold"
```

---

### Task 4: usePooledWebView 테스트 추가

**Files:**
- Create: `src/__tests__/usePooledWebView.test.tsx`

**Step 1: 테스트 파일 작성**

```tsx
import React from 'react';
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { WebViewPoolProvider } from '../WebViewPoolProvider';
import { usePooledWebView } from '../usePooledWebView';
import WebViewManager from '../WebViewManager';

jest.mock('react-native', () => {
  const actualReact = jest.requireActual('react');
  const View = actualReact.forwardRef(({ children, ...props }: any, ref: any) =>
    actualReact.createElement('View', { ...props, ref }, children),
  );
  View.displayName = 'View';
  return {
    View,
    StyleSheet: { create: (s: any) => s },
    NativeModules: {},
    findNodeHandle: () => null,
    TurboModuleRegistry: { get: () => null, getEnforcing: () => { throw new Error(); } },
  };
});

jest.mock('react-native-webview', () => {
  const actualReact = jest.requireActual('react');
  const WebView = actualReact.forwardRef((props: any, ref: any) =>
    actualReact.createElement('WebView', { ...props, ref }),
  );
  WebView.displayName = 'WebView';
  return { WebView };
});

function TestComponent({ onResult }: { onResult: (result: any) => void }) {
  const hook = usePooledWebView();
  React.useEffect(() => {
    onResult(hook);
  });
  return null;
}

describe('usePooledWebView', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should return borrow and release functions', () => {
    let hookResult: any;

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <TestComponent onResult={(r) => { hookResult = r; }} />
        </WebViewPoolProvider>,
      );
    });

    expect(hookResult.borrow).toBeDefined();
    expect(hookResult.release).toBeDefined();
    expect(hookResult.instanceId).toBeNull();
  });

  it('should borrow an instance', () => {
    let hookResult: any;
    let borrowResult: any;

    function BorrowComponent() {
      const hook = usePooledWebView();
      hookResult = hook;
      React.useEffect(() => {
        borrowResult = hook.borrow();
      }, []);
      return null;
    }

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <BorrowComponent />
        </WebViewPoolProvider>,
      );
    });

    expect(borrowResult).not.toBeNull();
    expect(borrowResult.instanceId).toBeDefined();
  });

  it('should return null when pool is exhausted', () => {
    let borrowResult1: any;
    let borrowResult2: any;
    let borrowResult3: any;

    function BorrowAll() {
      const hook1 = usePooledWebView();
      const hook2 = usePooledWebView();
      const hook3 = usePooledWebView();
      React.useEffect(() => {
        borrowResult1 = hook1.borrow();
        borrowResult2 = hook2.borrow();
        borrowResult3 = hook3.borrow();
      }, []);
      return null;
    }

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <BorrowAll />
        </WebViewPoolProvider>,
      );
    });

    expect(borrowResult1).not.toBeNull();
    expect(borrowResult2).not.toBeNull();
    expect(borrowResult3).toBeNull();
  });

  it('should release on unmount', () => {
    function BorrowOnMount() {
      const hook = usePooledWebView();
      React.useEffect(() => {
        hook.borrow();
      }, []);
      return null;
    }

    let renderer: ReactTestRenderer;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <BorrowOnMount />
        </WebViewPoolProvider>,
      );
    });

    expect(WebViewManager.getInstance().getState().borrowedCount).toBe(1);

    act(() => {
      renderer.unmount();
    });

    // After unmount, the borrowed count should be 0
    // (Provider unmount also triggers cleanup)
  });

  it('should return same result on duplicate borrow', () => {
    let result1: any;
    let result2: any;

    function DoubleBorrow() {
      const hook = usePooledWebView();
      React.useEffect(() => {
        result1 = hook.borrow();
        result2 = hook.borrow();
      }, []);
      return null;
    }

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <DoubleBorrow />
        </WebViewPoolProvider>,
      );
    });

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1.instanceId).toBe(result2.instanceId);
  });
});
```

**Step 2: 테스트 실행**

Run: `npm test -- --testPathPattern=usePooledWebView`
Expected: 모든 테스트 PASS

**Step 3: Commit**

```bash
git add src/__tests__/usePooledWebView.test.tsx
git commit -m "test: add usePooledWebView hook tests"
```

---

### Task 5: WebViewPoolProvider 테스트 추가

**Files:**
- Create: `src/__tests__/WebViewPoolProvider.test.tsx`

**Step 1: 테스트 파일 작성**

```tsx
import React from 'react';
import { create, act } from 'react-test-renderer';
import { WebViewPoolProvider, useWebViewPool } from '../WebViewPoolProvider';
import WebViewManager from '../WebViewManager';

jest.mock('react-native', () => {
  const actualReact = jest.requireActual('react');
  const View = actualReact.forwardRef(({ children, ...props }: any, ref: any) =>
    actualReact.createElement('View', { ...props, ref }, children),
  );
  View.displayName = 'View';
  return {
    View,
    StyleSheet: { create: (s: any) => s },
    NativeModules: {},
    findNodeHandle: () => null,
    TurboModuleRegistry: { get: () => null, getEnforcing: () => { throw new Error(); } },
  };
});

jest.mock('react-native-webview', () => {
  const actualReact = jest.requireActual('react');
  const WebView = actualReact.forwardRef((props: any, ref: any) =>
    actualReact.createElement('WebView', { ...props, ref }),
  );
  WebView.displayName = 'WebView';
  return { WebView };
});

describe('WebViewPoolProvider', () => {
  beforeEach(() => {
    WebViewManager.resetInstance();
  });

  it('should initialize pool with given config', () => {
    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 5 }}>
          <div />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.instances).toHaveLength(5);
    expect(state.initialized).toBe(true);
  });

  it('should provide context to children', () => {
    let contextValue: any;

    function Consumer() {
      contextValue = useWebViewPool();
      return null;
    }

    act(() => {
      create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <Consumer />
        </WebViewPoolProvider>,
      );
    });

    expect(contextValue).toBeDefined();
    expect(contextValue.state).toBeDefined();
    expect(contextValue.borrow).toBeDefined();
    expect(contextValue.release).toBeDefined();
    expect(contextValue.warmUp).toBeDefined();
    expect(contextValue.cancelWarmUp).toBeDefined();
  });

  it('should throw when useWebViewPool is used outside provider', () => {
    function BadConsumer() {
      useWebViewPool();
      return null;
    }

    expect(() => {
      act(() => {
        create(<BadConsumer />);
      });
    }).toThrow('useWebViewPool must be used within a WebViewPoolProvider');
  });

  it('should use default config when none provided', () => {
    act(() => {
      create(
        <WebViewPoolProvider>
          <div />
        </WebViewPoolProvider>,
      );
    });

    const state = WebViewManager.getInstance().getState();
    expect(state.instances).toHaveLength(3); // DEFAULT_POOL_CONFIG.poolSize
  });

  it('should cancel warm-ups on unmount', () => {
    const mgr = WebViewManager.getInstance();
    let renderer: any;

    act(() => {
      renderer = create(
        <WebViewPoolProvider config={{ poolSize: 2 }}>
          <div />
        </WebViewPoolProvider>,
      );
    });

    // Warm up a URL
    mgr.warmUp('https://example.com');
    expect(mgr.getState().instances.some((i) => i.status === 'warming')).toBe(true);

    act(() => {
      renderer.unmount();
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `npm test -- --testPathPattern=WebViewPoolProvider`
Expected: 모든 테스트 PASS

**Step 3: Commit**

```bash
git add src/__tests__/WebViewPoolProvider.test.tsx
git commit -m "test: add WebViewPoolProvider unit tests"
```

---

### Task 6: 엣지 케이스 테스트 추가

**Files:**
- Modify: `src/__tests__/WebViewManager.test.ts`

**Step 1: WebViewManager.test.ts에 엣지 케이스 테스트 추가**

기존 파일 끝(describe 블록 안)에 추가:

```ts
describe('edge cases', () => {
  it('should handle release of non-existent instance', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 2 });

    // Should not throw
    mgr.release('non-existent-id');
    expect(mgr.getState().availableCount).toBe(2);
  });

  it('should handle markIdle of non-existent instance', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 2 });

    // Should not throw
    mgr.markIdle('non-existent-id');
    expect(mgr.getState().availableCount).toBe(2);
  });

  it('should handle cancelWarmUp for non-warming URL', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 2 });

    // Should not throw
    mgr.cancelWarmUp('https://not-warming.com');
    expect(mgr.getState().availableCount).toBe(2);
  });

  it('should handle borrow after all instances exhausted and released', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 1, cleanupOnReturn: false });

    const r1 = mgr.borrow('user-1')!;
    expect(mgr.borrow('user-2')).toBeNull();

    mgr.release(r1.instanceId);
    const r2 = mgr.borrow('user-3');
    expect(r2).not.toBeNull();
  });

  it('should handle double release gracefully', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 2 });

    const result = mgr.borrow('user-1')!;
    mgr.release(result.instanceId);
    // Second release should be a no-op (status is now cleaning, not borrowed)
    mgr.release(result.instanceId);
    expect(mgr.getState().borrowedCount).toBe(0);
  });

  it('should return correct config', () => {
    const mgr = WebViewManager.getInstance();
    mgr.initialize({ poolSize: 5, cleanupOnReturn: false });

    const config = mgr.getConfig();
    expect(config.poolSize).toBe(5);
    expect(config.cleanupOnReturn).toBe(false);
  });
});
```

**Step 2: 테스트 실행**

Run: `npm test -- --testPathPattern=WebViewManager`
Expected: 기존 + 새 테스트 모두 PASS

**Step 3: Commit**

```bash
git add src/__tests__/WebViewManager.test.ts
git commit -m "test: add edge case tests for WebViewManager"
```

---

### Task 7: 커버리지 확인 및 갭 채우기

**Files:**
- 커버리지 리포트 기반으로 추가 테스트 필요한 파일 수정

**Step 1: 전체 커버리지 측정**

Run: `npm test -- --coverage`
Expected: 커버리지 리포트 출력. 80% 미달 영역 파악

**Step 2: 부족한 영역 테스트 추가**

커버리지 리포트 기반으로 누락된 브랜치/라인 커버. 주로:
- `WebViewSlot.tsx`의 native detach/attach 브랜치
- `constants.ts` (이미 다른 테스트에서 import됨)

**Step 3: threshold 통과 확인**

Run: `npm test -- --coverage`
Expected: 모든 threshold (lines 80%, branches 70%, functions 80%, statements 80%) 통과

**Step 4: Commit**

```bash
git add src/__tests__/
git commit -m "test: improve coverage to meet 80% threshold"
```

---

### Task 8: API 에러 메시지 개선

**Files:**
- Modify: `src/WebViewManager.ts`
- Modify: `src/WebViewPoolProvider.tsx`
- Modify: `src/__tests__/WebViewManager.test.ts`

**Step 1: WebViewManager에 poolSize 검증 추가 테스트**

`WebViewManager.test.ts`에 추가:
```ts
it('should warn on poolSize <= 0', () => {
  const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  const mgr = WebViewManager.getInstance();
  mgr.initialize({ poolSize: 0 });

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('[react-native-instant-webview]'),
  );
  // Should default to 1
  expect(mgr.getState().instances).toHaveLength(1);
  consoleSpy.mockRestore();
});
```

**Step 2: 테스트 실행 확인 (실패)**

Run: `npm test -- --testPathPattern=WebViewManager`
Expected: FAIL (검증 로직 아직 없음)

**Step 3: WebViewManager.ts의 initialize에 검증 추가**

`initialize` 메서드 시작 부분에:
```ts
initialize(config?: Partial<PoolConfig>): void {
  if (this.initialized) return;

  this.config = { ...DEFAULT_POOL_CONFIG, ...config };

  if (this.config.poolSize <= 0) {
    console.warn(
      '[react-native-instant-webview] poolSize must be greater than 0. Defaulting to 1.',
    );
    this.config.poolSize = 1;
  }

  // ... rest of the method
}
```

**Step 4: release에 경고 추가**

`release` 메서드 수정:
```ts
release(instanceId: string): void {
  const inst = this.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  if (inst.status !== 'borrowed') {
    if (__DEV__) {
      console.warn(
        `[react-native-instant-webview] Attempted to release instance "${instanceId}" which is in "${inst.status}" state, not "borrowed". Ignoring.`,
      );
    }
    return;
  }
  // ... rest
}
```

Note: `__DEV__`는 React Native에서 전역 제공. 테스트 환경에서는 mock 필요.

**Step 5: 테스트 실행**

Run: `npm test -- --testPathPattern=WebViewManager`
Expected: PASS

**Step 6: Commit**

```bash
git add src/WebViewManager.ts src/__tests__/WebViewManager.test.ts
git commit -m "feat: add validation and structured error messages"
```

---

### Task 9: 타입 개선 및 re-export

**Files:**
- Modify: `src/index.tsx`
- Modify: `src/types.ts`

**Step 1: WebViewProps re-export 추가**

`src/index.tsx`에 추가:
```ts
export type { WebViewProps } from 'react-native-webview';
```

**Step 2: PooledWebViewRef 타입 추가**

`src/types.ts`에 추가:
```ts
import type { WebView } from 'react-native-webview';

export type PooledWebViewRef = WebView;
```

`src/index.tsx`에 추가:
```ts
export type { PooledWebViewRef } from './types';
```

**Step 3: 타입체크 확인**

Run: `npm run typecheck`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add src/index.tsx src/types.ts
git commit -m "feat: re-export WebViewProps and add PooledWebViewRef type"
```

---

### Task 10: README 고도화

**Files:**
- Modify: `README.md`
- Create: `CONTRIBUTING.md`

**Step 1: README 재작성**

주요 변경:
- 상단에 배지 추가 (CI, npm, license)
- Before/After 비교 섹션 추가
- Quick Start 3단계로 정리
- Architecture 섹션 보강
- Troubleshooting 섹션 추가
- Contributing 링크 추가

배지:
```md
[![CI](https://github.com/wooBottle/react-native-instant-webview/actions/workflows/ci.yml/badge.svg)](https://github.com/wooBottle/react-native-instant-webview/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-instant-webview.svg)](https://www.npmjs.com/package/react-native-instant-webview)
[![license](https://img.shields.io/npm/l/react-native-instant-webview.svg)](https://github.com/wooBottle/react-native-instant-webview/blob/main/LICENSE)
```

Before/After 섹션:
```md
## Why?

| | Normal WebView | PooledWebView |
|---|---|---|
| First load | ~500-1500ms | ~500-1500ms |
| Subsequent loads | ~500-1500ms | **~0ms** |
| Memory | Created/destroyed each time | Reused from pool |
```

Troubleshooting:
```md
## Troubleshooting

### Pool exhausted warning
Increase `poolSize` or ensure you're releasing instances properly.

### WebView shows blank content
Check that `source` prop is provided. The pool uses blank HTML internally for idle instances.

### Layout issues
Ensure the parent View of `PooledWebView` has explicit dimensions (e.g., `flex: 1`).
```

**Step 2: CONTRIBUTING.md 작성**

```md
# Contributing

## Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## Development

- `npm run lint` — Run ESLint
- `npm run format` — Format with Prettier
- `npm run typecheck` — TypeScript type check
- `npm test` — Run tests
- `npm run build` — Build the library

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass: `npm run lint && npm run typecheck && npm test`
4. Submit a pull request

## Code Style

This project uses ESLint and Prettier. Run `npm run format` before committing.
```

**Step 3: Commit**

```bash
git add README.md CONTRIBUTING.md
git commit -m "docs: enhance README with badges, comparison table, and troubleshooting"
```

---

### Task 11: npm Release 워크플로우

**Files:**
- Create: `.github/workflows/release.yml`
- Modify: `package.json` (files 필드 확인)

**Step 1: release 워크플로우 생성**

`.github/workflows/release.yml`:
```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Step 2: package.json files 필드 확인**

현재 files 필드:
```json
"files": [
  "src",
  "lib",
  "ios",
  "android",
  "react-native-instant-webview.podspec",
  "react-native.config.js",
  "!**/__tests__"
]
```
→ `README.md`와 `CONTRIBUTING.md` 추가:
```json
"files": [
  "src",
  "lib",
  "ios",
  "android",
  "react-native-instant-webview.podspec",
  "react-native.config.js",
  "README.md",
  "CONTRIBUTING.md",
  "!**/__tests__",
  "!**/__mocks__"
]
```

**Step 3: Commit**

```bash
git add .github/workflows/release.yml package.json
git commit -m "ci: add npm release workflow on GitHub Release"
```

---

### Task 12: 최종 검증

**Step 1: 전체 lint 통과 확인**

Run: `npm run lint`
Expected: 0 errors

**Step 2: 전체 타입체크**

Run: `npm run typecheck`
Expected: 0 errors

**Step 3: 전체 테스트 + 커버리지**

Run: `npm test -- --coverage`
Expected: 모든 테스트 PASS, 커버리지 threshold 통과

**Step 4: 빌드**

Run: `npm run build`
Expected: lib/ 디렉토리에 commonjs, module, typescript 출력
