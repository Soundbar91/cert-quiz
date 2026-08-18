import { readFile } from "node:fs/promises";

const errors = [];

function normalize(text) {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** 단일정답 `answer` 표기를 `answers` 배열로 통일한다. */
function answersOf(entry) {
  if (Array.isArray(entry.answers)) return entry.answers;
  return Number.isInteger(entry.answer) ? [entry.answer] : [];
}

function checkQuestions(label, entries) {
  for (const entry of entries) {
    const choices = entry.choices;
    if (!Array.isArray(choices) || choices.length < 4 || choices.length > 6) {
      errors.push(`${label} ${entry.id}: 선택지가 4~6개가 아님 (${choices?.length})`);
      continue;
    }
    const answers = answersOf(entry);
    if (answers.length === 0) {
      errors.push(`${label} ${entry.id}: 정답이 없음`);
      continue;
    }
    if (new Set(answers).size !== answers.length) {
      errors.push(`${label} ${entry.id}: 정답 인덱스 중복`);
    }
    for (const index of answers) {
      if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
        errors.push(`${label} ${entry.id}: 정답 인덱스가 선택지 범위를 벗어남`);
      }
    }
  }
}

/**
 * 해설은 자격증마다 형태가 다르다.
 *
 * - structured: 직접 작성한 해설. 핵심 개념·정답 근거·선택지별 해설을 모두 갖춰야 한다.
 * - freeform: 원본 문서에서 추출한 서술형 해설. 본문이나 참고 링크 중 하나는 있어야 한다.
 */
function checkExplanations(label, entries, explanations, style) {
  const ids = entries.map((entry) => entry.id);
  const idSet = new Set(ids);

  for (const entry of entries) {
    const explanation = explanations[entry.id];
    if (!explanation) {
      errors.push(`${label} ${entry.id}: 해설 없음`);
      continue;
    }

    if (style === "structured") {
      if ((explanation.core ?? "").length < 30) {
        errors.push(`${label} ${entry.id}: 핵심 개념이 너무 짧음`);
      }
      if ((explanation.answerReason ?? "").length < 25) {
        errors.push(`${label} ${entry.id}: 정답 근거가 너무 짧음`);
      }
      if (
        !Array.isArray(explanation.choiceReasons) ||
        explanation.choiceReasons.length !== entry.choices.length
      ) {
        errors.push(
          `${label} ${entry.id}: 선택지 해설이 ${entry.choices.length}개가 아님`,
        );
      }
      continue;
    }

    const hasBody = (explanation.body ?? "").length > 0;
    const hasReferences = (explanation.references ?? []).length > 0;
    if (!hasBody && !hasReferences) {
      errors.push(`${label} ${entry.id}: 해설 본문과 참고 링크가 모두 없음`);
    }
  }

  for (const id of Object.keys(explanations)) {
    if (!idSet.has(id)) errors.push(`${label} ${id}: 대응 문항이 없는 해설`);
  }

  if (idSet.size !== ids.length) {
    errors.push(`${label}: 문항 ID 중복`);
  }
}

function checkDuplicates(label, entries) {
  const seen = new Map();
  for (const entry of entries) {
    const answerText = answersOf(entry)
      .map((index) => normalize(entry.choices[index] ?? ""))
      .join("|");
    const key = `${normalize(entry.question)}|${answerText}`;
    if (seen.has(key)) {
      errors.push(`${label}: 중복 문항 — ${seen.get(key)} 와 ${entry.id}`);
      continue;
    }
    seen.set(key, entry.id);
  }
}

/** 2급 1차만 TypeScript 소스에 있어 q(...) 호출을 파싱한다. */
async function readCha1Entries() {
  const source = await readFile("app/questions.ts", "utf8");
  const pattern =
    /^\s*q\(\s*"([^"]+)",\s*"[^"]*",\s*"((?:[^"\\]|\\.)*)",\s*\[((?:[^\]\\]|\\.)*)\],\s*(\d)/gm;
  const entries = [...source.matchAll(pattern)].map((match) => ({
    id: match[1],
    question: match[2],
    choices: [...match[3].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]),
    answers: [Number(match[4])],
  }));
  const ids = [...source.matchAll(/^\s*q\("([^"]+)"/gm)].map((match) => match[1]);

  if (entries.length !== ids.length) {
    errors.push(
      `2급 1차: 문항 파싱 불일치 (${entries.length}/${ids.length}) — validate 스크립트의 패턴을 확인하세요`,
    );
  }
  return entries;
}

const sources = [
  {
    label: "2급 1차",
    entries: await readCha1Entries(),
    explanationPath: "app/data/explanations.json",
    style: "structured",
  },
  {
    label: "2급 2차",
    questionPath: "app/data/questions-cha2.json",
    explanationPath: "app/data/explanations-cha2.json",
    style: "structured",
  },
  {
    label: "1급 1차",
    questionPath: "app/data/questions-geup1.json",
    explanationPath: "app/data/explanations-geup1.json",
    style: "structured",
  },
  {
    label: "AWS SAA-C03",
    questionPath: "app/data/questions-saa.json",
    explanationPath: "app/data/explanations-saa.json",
    style: "freeform",
  },
];

const summary = [];

for (const source of sources) {
  const entries =
    source.entries ?? JSON.parse(await readFile(source.questionPath, "utf8"));
  const explanations = JSON.parse(await readFile(source.explanationPath, "utf8"));

  checkQuestions(source.label, entries);
  checkExplanations(source.label, entries, explanations, source.style);
  checkDuplicates(source.label, entries);
  summary.push(`${source.label} ${entries.length}문항`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`${summary.join(", ")}의 해설·중복 검사를 통과했습니다.`);
