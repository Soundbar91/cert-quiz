# 자격증 랜덤 퀴즈 (cert-quiz)

자격증 기출문제를 무작위로 풀고 해설을 확인하는 학습용 웹앱입니다.
[vinext](https://github.com/cloudflare/vinext) (Next.js App Router 호환) +
Cloudflare Workers 위에서 동작합니다.

로그인·회원·랭킹 기능은 없습니다. 문제를 풀고 해설을 보는 것이 전부이며,
모든 문항은 빌드 타임에 정적으로 번들되므로 데이터베이스도 쓰지 않습니다.

## 수록 자격증

| 자격증 | 과정 | 문항 수 |
| --- | --- | --- |
| 리눅스마스터 | 2급 1차 | 255 |
| 리눅스마스터 | 2급 2차 | 327 |
| 리눅스마스터 | 1급 1차 | 472 |
| AWS SAA | SAA-C03 | 709 |

## 기능

- **2단계 선택**: 자격증을 고르고 → 그 안의 과정을 고릅니다
- **랜덤 출제**: 문항 수(10 / 20 / 전체)를 고르면 무작위 순서로 중복 없이 출제
- **복수정답 지원**: 4~6지선다, 정답 1~3개. 복수정답 문항은 정답 개수만큼 고른 뒤
  '정답 확인'을 눌러 채점합니다
- **해설**: 리눅스마스터는 핵심 개념·정답 근거·선택지별 해설, AWS SAA는 원본
  서술형 해설과 AWS 공식 문서 링크를 제공합니다

## 데이터

- `app/questions.ts` — 리눅스마스터 2급 1차 족보 문항 (수작업 정제)
- `app/data/questions-cha2.json` — 2급 2차 족보 문항 (PDF 추출 → 정제·중복 제거)
- `app/data/questions-geup1.json` — 1급 1차 기출 문항 (2017~2023 10회분)
- `app/data/questions-saa.json` — AWS SAA-C03 기출 문항
- `app/data/explanations*.json` — 문항별 해설
- `scripts/extract-saa.py` — SAA 원본 PDF → 문항·해설 JSON 추출
- `scripts/validate-explanations.mjs` — 문항·해설 매칭, 정답 범위, 중복 문항 검사
  (빌드 시 실행)

지문이나 선택지가 이미지로만 제시되어 텍스트만으로 자체 완결되지 않는 문항은
제외했습니다.

족보·기출 원본 PDF는 상업 자료(무단 배포 금지 표기)이므로 저장소에 포함하지
않습니다 (`docs/` 하위는 gitignore 처리).

### SAA 데이터 재생성

원본 PDF를 `docs/AWS SAA/SAA-C03_Examtopics_V18.35_KOR.pdf` 에 두고 실행합니다.

```bash
python3 -m pip install --user pypdf cryptography
python3 scripts/extract-saa.py
```

## 자격증 추가하기

`app/quiz-data.ts` 의 `certifications` 배열에 항목을 추가하면 홈 화면에 바로
나타납니다. 문항 JSON은 `answer`(단일정답) 또는 `answers`(복수정답) 중 어느
표기든 되며, 로더의 `normalizeQuestions` 가 내부 표현으로 통일합니다.

## 개발

```bash
npm install
npm run dev        # 로컬 개발 서버
npm run build      # 해설 검증 + 프로덕션 빌드
npm test           # 빌드 + 렌더링 테스트
npm run lint
```
