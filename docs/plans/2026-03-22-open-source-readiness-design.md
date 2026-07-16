# Open Source Readiness Design

## Goal

react-native-instant-webview를 오픈소스 커뮤니티에서 신뢰받고 채택될 수 있는 수준으로 끌어올린다.

## Approach: Foundation First

기반 인프라부터 쌓고, 품질 보증 체계를 갖춘 뒤 외부 노출을 개선한다.

---

## 1. ESLint + Prettier 설정

- `@react-native/eslint-config` 기반 ESLint
- Prettier 통합 (ESLint 충돌 방지)
- `lint`, `format` 스크립트 추가
- `.eslintignore` / `.prettierignore`: `lib/`, `node_modules/` 제외
- 대상: `src/`, `example/`
- 기존 코드에 린트 적용 후 자동 수정

## 2. GitHub Actions CI

- 트리거: `main` push + PR
- 매트릭스: Node 18, 20
- Job: lint → typecheck → test (커버리지) → build
- Jest `--coverage`로 커버리지 생성
- README 배지: CI status, npm version, license

## 3. Test Coverage

- 추가 테스트: `usePooledWebView`, `WebViewPoolProvider`
- 엣지 케이스: 풀 소진 후 연속 borrow, 동시 release, unmount 중 release
- `collectCoverageFrom`: `src/**/*.{ts,tsx}` (mock/test 제외)
- 커버리지 threshold: 80% (lines)
- CI에서 threshold 미달 시 실패 처리

## 4. API Improvements

### Error Messages
- 풀 부족 시 구조화된 에러 (상황 설명 + 해결 안내)
- `WebViewPoolProvider` 없이 사용 시 명확한 에러
- 이미 release된 인스턴스 재 release 시 경고
- `poolSize` 유효성 검증 (0, 음수)

### Type Improvements
- `WebViewProps` 재export
- `PooledWebViewRef` 타입 export

## 5. README

- 상단 배지 (CI, npm, license)
- 한줄 설명 + 핵심 가치
- Before/After 비교표
- Quick Start (3단계)
- API Reference 구조 정리
- Architecture 다이어그램
- Contributing 가이드
- Troubleshooting 섹션

## 6. npm Release Automation

- GitHub Actions `release` 워크플로우
- 트리거: GitHub Release 생성 시
- 단계: lint → typecheck → test → build → npm publish
- `NPM_TOKEN` GitHub Secrets 등록 (수동 1회)
- `package.json` `files` 필드 정리
