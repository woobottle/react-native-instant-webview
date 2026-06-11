# iOS Fabric Native View Detachment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** iOS의 New Architecture(bridgeless/Fabric)에서 idle WebView를 네이티브 뷰 트리에서 실제로 제거(detach)해 렌더/메모리 비용을 줄이되, WKWebView 인스턴스는 살려 풀링을 유지한다.

**Architecture:** 0.2.1은 새 아키텍처에서 native detach를 전면 비활성(JS 폴백)했다. 본 작업은 iOS 모듈의 뷰 조회를 레거시 `self.bridge`+`RCTUIManager`에서 bridgeless 호환 `RCTViewRegistry`(host 주입, `viewForReactTag:`)로 교체하고, JS 게이트를 플랫폼 인지로 바꿔 iOS 새 아키텍처에서만 native 경로를 재활성한다. Fabric mounting과의 충돌 위험은 example 앱 PoC로 선검증한다(접근 A; 충돌 시 접근 B 재설계).

**Tech Stack:** Objective-C++ (iOS TurboModule), TypeScript, Jest, React Native 0.76(example) / 0.83(consumer).

**참고 — 사전 컨텍스트:**
- 모듈 구현: `ios/InstantWebViewModule.mm` (`detachView(tag)`, `attachView(tag, parentTag)`).
- JS 게이트: `src/native/NativeViewDetachment.ts` (`hasNativeModule`, `isNewArchitecture()`).
- 검증 앱: `example/bare` (RN 0.76.5, `react-native-instant-webview: file:../..`, 네비게이션 push/pop으로 풀 borrow/return 트리거, Pods 설치됨).
- 빌드는 환경 의존(첫 iOS 빌드 10~20분). 환경 명령은 직접 실행하거나 `! <command>`로 위임.

---

### Task 1: JS 게이트를 플랫폼 인지로 변경 (TDD)

**Files:**
- Modify: `src/native/NativeViewDetachment.ts`
- Test: `src/__tests__/NativeViewDetachment.test.ts`

**Step 1: 실패 테스트 추가**

`src/__tests__/NativeViewDetachment.test.ts` 의 `describe('isNewArchitecture')` 아래에 새 describe 추가. `hasNativeModule`은 모듈 로드 시 1회 계산되므로 `jest.isolateModules` + react-native mock 조작으로 검증한다. 기존 mock(`src/__mocks__/react-native.ts`)은 `NativeModules`가 비어 있어 `hasNativeModule`이 항상 false다 — 이를 우회하기 위해 모듈 단위로 react-native를 다시 mock한다.

```ts
describe('hasNativeModule (platform-aware new-arch gate)', () => {
  const g = global as { RN$Bridgeless?: boolean; nativeFabricUIManager?: unknown };
  const orig = { b: g.RN$Bridgeless, f: g.nativeFabricUIManager };
  afterEach(() => {
    g.RN$Bridgeless = orig.b;
    g.nativeFabricUIManager = orig.f;
    jest.resetModules();
    jest.dontMock('react-native');
  });

  function loadWith(os: 'ios' | 'android', bridgeless: boolean): boolean {
    let result = false;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        NativeModules: { InstantWebView: {} },
        findNodeHandle: () => 1,
        Platform: { OS: os },
      }));
      g.RN$Bridgeless = bridgeless;
      delete g.nativeFabricUIManager;
      result = require('../native/NativeViewDetachment').hasNativeModule;
    });
    return result;
  }

  it('enables native on iOS under the new architecture', () => {
    expect(loadWith('ios', true)).toBe(true);
  });
  it('disables native on Android under the new architecture', () => {
    expect(loadWith('android', true)).toBe(false);
  });
  it('enables native on both platforms on the legacy architecture', () => {
    expect(loadWith('ios', false)).toBe(true);
    expect(loadWith('android', false)).toBe(true);
  });
});
```

**Step 2: 실패 확인**

Run: `npx jest src/__tests__/NativeViewDetachment.test.ts --forceExit`
Expected: 새 테스트 FAIL (현재 `hasNativeModule`은 새 아키텍처면 플랫폼 무관 false → iOS 케이스 실패). `Platform`이 기존 mock에 있는지 확인 — 없으면 mock에 추가 필요(아래 Step 3에서 처리).

**Step 3: 구현**

`src/native/NativeViewDetachment.ts` 상단 import에 `Platform` 추가, 게이트 수정:

```ts
import { NativeModules, Platform, findNodeHandle } from 'react-native';
```

```ts
// iOS 모듈은 RCTViewRegistry로 새 아키텍처를 지원한다. Android 모듈은 아직
// 레거시 UIManagerModule 기반이라 새 아키텍처에선 JS 폴백을 유지한다.
export const hasNativeModule =
  NativeModule != null && (!isNewArchitecture() || Platform.OS === 'ios');
```

`src/__mocks__/react-native.ts` 에 `Platform` export가 없으면 추가:

```ts
const Platform = { OS: 'ios' as 'ios' | 'android' };
// ...
export { View, StyleSheet, NativeModules, findNodeHandle, TurboModuleRegistry, Platform };
```

**Step 4: 통과 확인 + 전체 스위트 회귀 없음**

Run: `npx jest --forceExit`
Expected: 전체 PASS (기존 80 + 신규 3). `npx tsc --noEmit` exit 0, `npx eslint src/native/NativeViewDetachment.ts src/__tests__/NativeViewDetachment.test.ts` 무경고.

**Step 5: Commit**

```bash
git add src/native/NativeViewDetachment.ts src/__tests__/NativeViewDetachment.test.ts src/__mocks__/react-native.ts
git commit -m "feat: enable native detach on iOS under the new architecture (JS gate)"
```

---

### Task 2: bridgeless 뷰 접근 API 확인 (추측 금지)

**Files:** (조사만 — 코드 변경 없음)

**Step 1: 설치된 React 헤더에서 정확한 API 확인**

`example/bare` Pods 헤더에서 bridgeless 뷰 레지스트리 주입 API를 확인한다:

```bash
cd example/bare/ios
grep -rn "viewRegistry_DEPRECATED\|viewForReactTag" Pods/Headers/Public/React-Core 2>/dev/null | head
grep -rln "RCTViewRegistry" Pods/Headers 2>/dev/null | head
```

Expected: `RCTViewRegistry` 클래스(`- (UIView *)viewForReactTag:(NSNumber *)reactTag;`)와 모듈 주입용 `viewRegistry_DEPRECATED` 선언 위치를 확인.

**Step 2: 결과를 설계 문서에 기록**

확인한 헤더 경로/심볼명(예: `#import <React/RCTViewRegistry.h>`, 프로퍼티 `@synthesize viewRegistry_DEPRECATED = _viewRegistry;`)을 `docs/plans/2026-06-11-fabric-native-detach-design.md` 하단 "구현 노트"에 적는다. Task 3은 여기서 확인한 정확한 심볼만 사용한다.

> 주: API가 다르면(예: `RCTBridgelessViewRegistry`, `RCTSurfacePresenter.componentViewRegistry`) 해당 심볼로 Task 3을 조정한다.

**Step 3: Commit**

```bash
git add docs/plans/2026-06-11-fabric-native-detach-design.md
git commit -m "docs: record bridgeless view-access API for native detach"
```

---

### Task 3: iOS 모듈 — 새 아키텍처에서 RCTViewRegistry로 뷰 조회

**Files:**
- Modify: `ios/InstantWebViewModule.mm`

**Step 1: 구현 (Task 2에서 확인한 심볼 사용)**

새 아키텍처에서는 `self.bridge`/`RCTUIManager` 대신 주입된 `RCTViewRegistry`를 사용한다. 구 아키텍처 경로는 그대로 두어 회귀를 피한다.

```objc
#import "InstantWebViewModule.h"
#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTViewRegistry.h>
#else
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#endif

@interface InstantWebViewModule ()
#ifdef RCT_NEW_ARCH_ENABLED
<NativeInstantWebViewSpec>
#endif
@end

@implementation InstantWebViewModule {
  NSMapTable<NSNumber *, UIView *> *_detachedViews;
}

#ifdef RCT_NEW_ARCH_ENABLED
@synthesize viewRegistry_DEPRECATED = _viewRegistry;
#endif

RCT_EXPORT_MODULE(InstantWebView)

- (instancetype)init {
  self = [super init];
  if (self) {
    _detachedViews = [NSMapTable strongToStrongObjectsMapTable];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

RCT_EXPORT_METHOD(detachView:(double)tag) {
  NSNumber *viewTag = @((NSInteger)tag);
#ifdef RCT_NEW_ARCH_ENABLED
  UIView *view = [_viewRegistry viewForReactTag:viewTag];
  if (view && view.superview) {
    [_detachedViews setObject:view forKey:viewTag];
    [view removeFromSuperview];
  }
#else
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;
  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[viewTag];
    if (view && view.superview) {
      [self->_detachedViews setObject:view forKey:viewTag];
      [view removeFromSuperview];
    }
  }];
#endif
}

RCT_EXPORT_METHOD(attachView:(double)tag parentTag:(double)parentTag) {
  NSNumber *viewTag = @((NSInteger)tag);
  NSNumber *parentViewTag = @((NSInteger)parentTag);
#ifdef RCT_NEW_ARCH_ENABLED
  UIView *view = [_detachedViews objectForKey:viewTag];
  UIView *parent = [_viewRegistry viewForReactTag:parentViewTag];
  if (view && parent) {
    [parent addSubview:view];
    [_detachedViews removeObjectForKey:viewTag];
  }
#else
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;
  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = [self->_detachedViews objectForKey:viewTag];
    UIView *parent = viewRegistry[parentViewTag];
    if (view && parent) {
      [parent addSubview:view];
      [self->_detachedViews removeObjectForKey:viewTag];
    }
  }];
#endif
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInstantWebViewSpecJSI>(params);
}
#endif

@end
```

**Step 2: 임시 진단 로그 추가 (PoC용, 나중에 제거)**

`detachView`/`attachView`의 새 아키텍처 분기에 NSLog를 임시로 넣어 호출/조회 결과를 추적:

```objc
NSLog(@"[InstantWebView] detachView tag=%@ found=%d", viewTag, view != nil);
```
```objc
NSLog(@"[InstantWebView] attachView tag=%@ parent=%d", viewTag, parent != nil);
```

**Step 3: Commit**

```bash
git add ios/InstantWebViewModule.mm
git commit -m "feat(ios): resolve views via RCTViewRegistry under the new architecture"
```

---

### Task 4: PoC 검증 — example 앱(새 아키텍처)에서 충돌 여부 확인 (게이트)

**Files:** (검증만)

**Step 1: example 앱 iOS를 새 아키텍처로 준비**

```bash
cd example/bare
grep -n "RCT_NEW_ARCH_ENABLED\|NEW_ARCH" ios/Podfile.lock ios/*.xcode.env 2>/dev/null || true
# 새 아키텍처로 pod 재설치 (필요 시)
cd ios && RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
```

Expected: Podfile.lock/프로젝트가 new arch로 구성. (이미 new arch면 그대로.)

**Step 2: Metro 기동 + 시뮬레이터 빌드/실행**

```bash
cd example/bare
# Metro (별도, 충돌 없는 포트 권장)
RCT_METRO_PORT=8090 npx react-native start --port 8090 --reset-cache &
# 빌드/실행 (포트 충돌 시 --port 조정, RCT_METRO_PORT 동일하게 export)
RCT_METRO_PORT=8090 npx react-native run-ios --port 8090 --no-packager
```

**Step 3: borrow/return 사이클 반복 + 로그 관찰**

시뮬레이터에서 "PooledDetail"로 push(borrow) → back(pop, return→cleaning→idle) → 다시 push(re-borrow)를 3~5회 반복. 동시에 콘솔 로그 캡처:

```bash
timeout 30 xcrun simctl spawn booted log stream --predicate 'eventMessage CONTAINS "InstantWebView"' 2>&1 | head -40
```

검증 항목:
- [ ] `detachView ... found=1` / `attachView ... parent=1` 로그가 정상 출력(뷰 조회 성공).
- [ ] 반복 중 **크래시 없음**(앱이 홈으로 튕기지 않음 — `simctl io booted screenshot`로 확인).
- [ ] idle 시 WebView가 화면에서 사라지고(detach), re-borrow 시 **재로드 없이** 즉시 표시(attach + 풀링 유지).
- [ ] (선택) `po [[[UIApplication sharedApplication] keyWindow] recursiveDescription]` 또는 로그로 idle 시 superview에서 빠졌음을 확인.

**Step 4: 게이트 분기**

- ✅ 충돌 없음 → Task 5로.
- ❌ 크래시/뷰 깨짐 → 재현 로그를 `docs/plans/2026-06-11-fabric-native-detach-design.md` "PoC 결과"에 기록하고 **중단**. 접근 B(커스텀 Fabric 컴포넌트)로 별도 재설계(brainstorming 재진입). Task 3 변경은 되돌리거나 새 아키텍처 게이트를 다시 닫는다.

**Step 5: 진단 로그 제거 + Commit**

PoC 통과 시 Task 3에서 넣은 NSLog 제거:

```bash
git add ios/InstantWebViewModule.mm docs/plans/2026-06-11-fabric-native-detach-design.md
git commit -m "test(ios): validate native detach under new arch (PoC) + remove debug logs"
```

---

### Task 5: 회귀 검증 (구 아키텍처 + JS)

**Files:** (검증만)

**Step 1: JS 전체 스위트 / 타입 / 린트**

Run: `npx jest --forceExit && npx tsc --noEmit && npx eslint src/`
Expected: 전부 통과/무경고.

**Step 2: (가능 시) 구 아키텍처 회귀**

구 아키텍처 빌드가 손쉬우면 `RCT_NEW_ARCH_ENABLED=0`으로 example 재빌드해 detach/attach가 종전대로 동작하는지 1회 확인. (환경 부담이 크면 코드 리뷰로 대체 — 구 아키텍처 분기는 미변경.)

---

### Task 6: 릴리스 0.2.2 + 소비처 반영

**Files:**
- Modify: `package.json` (version)
- Modify: `apps/webview-host/package.json` (consumer, 別 레포)

**Step 1: 버전 범프 + 빌드 + pack 검증**

```bash
npm version 0.2.2 --no-git-tag-version
npm run build
npm pack --dry-run   # ios/InstantWebViewModule.mm, 수정된 src 포함 확인
git add package.json && git commit -m "chore: release v0.2.2" && git tag v0.2.2
```

**Step 2: 배포 (사용자 OTP 필요)**

```bash
npm publish --access public --otp=<6자리>
```
> npm 2FA OTP는 사용자에게 받아 즉시 실행하거나, 사용자가 직접 `npm publish` 한다.

**Step 3: webview-host 소비 갱신 (couple-calendar 레포)**

```bash
cd /Users/logan/Repository/wooBottle/mentoring/couple-calendar
# apps/webview-host/package.json: react-native-instant-webview ^0.2.1 -> ^0.2.2
pnpm install
pnpm --filter @couple-calendar/webview-host exec jest src/config.test.ts   # 회귀 확인
git add apps/webview-host/package.json pnpm-lock.yaml
git commit -m "chore(webview-host): consume react-native-instant-webview@^0.2.2"
```

---

## 완료 기준

- iOS 새 아키텍처에서 example 앱 borrow/return 반복 시 crash 없음.
- idle WebView가 네이티브 트리에서 제거되고(detach 로그/뷰 계층 확인), re-borrow 시 재로드 없이 복귀.
- JS 유닛 테스트(플랫폼 게이트 포함) 통과, tsc/lint 클린.
- 0.2.2 배포 후 webview-host가 정식 소비.
- PoC에서 충돌 시: 결과 기록 + 접근 B 재설계로 전환(본 플랜 중단).
