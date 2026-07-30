# 리눅스 마스터 랜덤 퀴즈

리눅스 마스터 2급 1차·2차 족보와 1급 1차 기출문제를 무작위로 풀고, 분야별
랭킹에 기록을 남길 수 있는 학습용 웹앱입니다. [vinext](https://github.com/cloudflare/vinext)
(Next.js App Router 호환) + Cloudflare Workers + D1(Drizzle) 위에서 동작합니다.

## 기능

- **분야 선택**: 첫 화면에서 2급 1차(255문항) / 2급 2차(327문항) / 1급 1차(472문항) 중 선택
- **랜덤 출제**: 문항 수(10 / 20 / 전체)를 고르면 무작위 순서로 중복 없이 출제
- **해설**: 문항마다 핵심 개념, 정답 근거, 선택지별 정답/오답 사유 제공
- **분야별 랭킹**: 퀴즈 완료 후 이름을 등록하면 D1에 저장되어 분야별 TOP 20 표시

## 데이터

- `app/questions.ts` — 2급 1차 족보 문항 (수작업 정제)
- `app/data/questions-cha2.json` — 2급 2차 족보 문항 (PDF 추출 → 정제·중복 제거)
- `app/data/questions-geup1.json` — 1급 1차 기출 문항 (2017~2023 10회분, 지문 박스가
  이미지라 소실된 문항은 제외하고 자체 완결형 문항만 수록)
- `app/data/explanations*.json` — 문항별 해설
- `scripts/validate-explanations.mjs` — 문항·해설 매칭, 중복 문항 검사 (빌드 시 실행)

족보·기출 원본 PDF는 상업 자료(무단 배포 금지 표기)이므로 저장소에 포함하지
않습니다 (`docs/리눅스1+2차 족보/`, `docs/리눅스 1급 1차/`는 gitignore 처리).

## 개발

```bash
npm install
npm run dev        # 로컬 개발 서버
npm run build      # 해설 검증 + 프로덕션 빌드
npm test           # 빌드 + 렌더링 테스트
npm run lint
npm run db:generate  # db/schema.ts 변경 후 마이그레이션 생성
```

랭킹 API는 Cloudflare D1 바인딩 `DB`를 사용합니다(`.openai/hosting.json`의
`"d1": "DB"`). 배포 플랫폼이 `dist/.openai/drizzle`의 마이그레이션을 적용하면
`rankings` 테이블이 생성됩니다. 테이블이 없는 환경에서는 랭킹 API가 안내
메시지를 반환하며, 퀴즈 풀이 자체는 DB 없이도 동작합니다.
