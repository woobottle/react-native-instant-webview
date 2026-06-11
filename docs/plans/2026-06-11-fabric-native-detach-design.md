# iOS Fabric Native View Detachment — Design

날짜: 2026-06-11
대상: `react-native-instant-webview` (iOS, New Architecture)
선행: 0.2.1에서 New Architecture native detach를 비활성(JS 폴백)으로 막아둠. 본 작업은 iOS에서 native detach를 되살린다.

## 목표 (성공 기준)

idle 상태의 WebView를 **네이티브 뷰 트리에서 완전히 제거**해 off-screen 렌더/컴포지션 비용과 메모리를 줄인다. 단 WKWebView 인스턴스는 살려 풀링(재로드 없음)을 유지한다. JS 폴백(HIDDEN_STYLE)은 뷰를 숨길 뿐 트리에 남겨두므로 이보다 더 나아가야 한다.

## 범위

- iOS 먼저. Android는 본 작업 범위 밖(새 아키텍처에서 계속 JS 폴백 유지).
- 접근 A: 기존 reparenting 로직을 Fabric 호환 API로 이식. PoC로 Fabric 충돌 여부 선검증.

## 핵심 난점

Fabric의 mounting 계층이 컴포넌트 뷰 부모-자식 관계를 소유한다. 모듈이 뷰를 임의로 `removeFromSuperview`하면, 같은 서브트리에 mount mutation이 발생할 때 인덱스 불일치로 crash하거나 Fabric이 되돌릴 수 있다. idle 동안 Fabric이 해당 서브트리를 건드리지 않는다는 가정에 의존하며, 이를 PoC로 검증한다.

## 설계

### 1. iOS 네이티브 모듈 (`ios/InstantWebViewModule.mm`)

- `[self.bridge moduleForClass:[RCTUIManager class]]` 제거 — bridgeless에서 `self.bridge`가 nil이라 `unrecognized selector` crash.
- `RCTViewRegistry` 주입 사용: `@synthesize viewRegistry_DEPRECATED = _viewRegistry;` — host가 bridgeless/Paper 모두에서 주입. `[_viewRegistry viewForReactTag:@(tag)]`로 뷰 조회(두 아키텍처 모두 동작하는 RN 공식 경로).
- `detachView(tag)`: 뷰 조회 → `_detachedViews[@(tag)]`에 강참조 보관 → `removeFromSuperview`.
- `attachView(tag, parentTag)`: parent 조회 → 보관 뷰를 `addSubview` → 맵에서 제거.
- 모든 UIView 변경은 메인스레드(모듈 methodQueue가 이미 main queue).
- 뷰 nil(타이밍) → no-op (기존 graceful 패턴 유지).

### 2. JS 게이트 (`src/native/NativeViewDetachment.ts`)

```ts
import { Platform } from 'react-native';
// iOS는 RCTViewRegistry로 새 아키텍처 지원; Android 모듈은 아직 레거시 UIManager 기반.
export const hasNativeModule =
  NativeModule != null && (!isNewArchitecture() || Platform.OS === 'ios');
```

### 3. PoC 게이트 (본구현 전 필수)

- `example/` 앱에서 borrow → return(idle/cleaning) → re-borrow 사이클 + 레이아웃 변경을 시뮬레이터에서 반복.
- `detach`/`attach`에 NSLog로 (a) 뷰 조회 성공, (b) crash/뷰 소실 없음, (c) idle 시 superview 분리·re-borrow 시 복귀 확인.
- 충돌 시: 본 문서에 결과 기록 후 접근 B(커스텀 Fabric 컴포넌트)로 전환(별도 재설계).

### 4. 테스트

- JS 유닛: `hasNativeModule` 플랫폼 분기 — iOS 새아키=on, Android 새아키=off, 구아키=on. `Platform.OS` mock 토글.
- 네이티브: 유닛 프레임워크 없음 → example 앱 + 시뮬레이터 + NSLog/뷰 계층 로그 + 스크린샷으로 검증.

## 검증 완료 기준

1. example 앱에서 풀 borrow/return 반복 시 crash 없음.
2. idle WebView가 네이티브 트리에서 제거됨(로그/뷰 계층으로 확인).
3. re-borrow 시 동일 WKWebView가 재로드 없이 즉시 표시(풀링 유지).
4. JS 유닛 테스트 통과, tsc/lint 클린.
```
