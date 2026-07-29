# 리눅스 마스터 2급 퀴즈 개편 설계 (2026-07-29)

## 배경 분석

- 스택: vinext(Next.js App Router 호환) + Vite + Cloudflare Workers, Tailwind v4(PostCSS), Drizzle + D1(옵트인, `db/schema.ts` 비어 있음), 배포 메타는 `.openai/hosting.json`.
- 기존 앱: `app/page.tsx` 단일 클라이언트 페이지. 1차 족보 256문항(`app/questions.ts`)을 셔플해 전량 1사이클로 출제. 해설은 `app/data/explanations.json`(core/answerReason/choiceReasons).
- 족보 원본: `docs/리눅스1+2차 족보/`
  - 1차: `리눅스 마스터 2급 1차 족보.pdf` (75쪽) → 이미 `questions.ts`로 반영됨.
  - 2차: `리눅스마스터2급 2차 족보.pdf` (55쪽, 문1~문406, 정답이 ❶❷❸❹로 표기) → 신규 반영 대상.
- 주의: 루트 `.openai/hosting.json`이 없어 현재 `npm run build`가 깨지는 상태. 복원 필요(dist에 남은 복사본 참조).

## 요구사항

1. 1차·2차 족보 기반 랜덤 출제, 중복 문항 제거.
2. 첫 진입 시 공부할 분야(1차/2차) 선택.
3. 퀴즈 종료 후 이름 등록 → 분야별 랭킹.
4. 기존 1차의 "교정 문항" 표시 제거, 해설 정확도 보완.

## 설계

### 데이터

- `app/questions.ts`: `Question` 타입에 `category: "cha1" | "cha2"` 도입. 1차 기존 문항 유지(`revised` 필드 제거), 2차 문항은 `app/questions-cha2.ts`로 분리 후 통합 export.
- 2차 추출: PDF 텍스트(문N + ①~④, 정답 ❶~❹)를 서브에이전트로 구간 분할 추출. 지문 박스가 텍스트 추출에서 소실·훼손된 문항은 제외(정확성 우선).
- 중복 제거: 정규화된 질문 텍스트+정답 기준으로 각 분야 내 중복 제거. `scripts/validate-explanations.mjs`에 중복 검사 추가해 빌드 시 강제.
- 해설: 기존 JSON 구조 유지. 1차 해설은 전량 검수·보정, 2차 해설은 신규 생성.

### UI 흐름 (단일 클라이언트 페이지 상태 머신)

`home`(분야 선택 + 문항 수 선택 10/20/전체 + 분야별 랭킹 미리보기) → `quiz`(기존 카드 UI 재사용, 교정 배지 제거) → `result`(점수 + 이름 입력 → 랭킹 등록 → 분야별 랭킹 표시).

### 랭킹 (D1)

- `rankings` 테이블: id, name, category, correct, total, percent, createdAt.
- `app/api/rankings/route.ts`: GET(분야별 상위 20, percent desc → total desc → 최신순), POST(이름 1~12자 검증).
- `.openai/hosting.json`의 `d1: "DB"` 활성화, `npm run db:generate`로 마이그레이션 생성(빌드 시 dist/.openai/drizzle로 패키징되어 플랫폼이 적용).

### 검증

- validate 스크립트: 1차+2차 문항·해설 매칭, 길이, 중복 문항 검사.
- `npm run build` + `npm test` 통과 확인.

## 대안 검토

- 랭킹 저장소: localStorage(공유 불가) vs D1(공유 가능, 템플릿이 이미 지원) → **D1 채택**.
- 문항 수: 전량 고정(사이클) vs 선택형 → 랭킹 비교 가능성과 학습 유연성을 위해 **10/20/전체 선택형**, 랭킹은 percent 기준.
