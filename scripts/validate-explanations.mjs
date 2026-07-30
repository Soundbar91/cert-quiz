import { readFile } from "node:fs/promises";

const errors = [];

function normalize(text) {
  return text.replace(/\s+/g, "").toLowerCase();
}

function checkExplanations(label, questionIds, explanations) {
  const explanationIds = Object.keys(explanations);

  for (const id of questionIds) {
    const explanation = explanations[id];
    if (!explanation) {
      errors.push(`${label} ${id}: 해설 없음`);
      continue;
    }
    if (explanation.core.length < 30) errors.push(`${label} ${id}: 핵심 개념이 너무 짧음`);
    if (explanation.answerReason.length < 25) {
      errors.push(`${label} ${id}: 정답 근거가 너무 짧음`);
    }
    if (
      !Array.isArray(explanation.choiceReasons) ||
      explanation.choiceReasons.length !== 4
    ) {
      errors.push(`${label} ${id}: 선택지 해설이 4개가 아님`);
    }
  }

  for (const id of explanationIds) {
    if (!questionIds.includes(id)) errors.push(`${label} ${id}: 대응 문항이 없는 해설`);
  }

  if (new Set(questionIds).size !== questionIds.length) {
    errors.push(`${label}: 문항 ID 중복`);
  }
  if (questionIds.length !== explanationIds.length) {
    errors.push(
      `${label}: 문항 ${questionIds.length}개와 해설 ${explanationIds.length}개가 일치하지 않음`,
    );
  }
}

function checkDuplicates(label, entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = `${normalize(entry.question)}|${normalize(entry.choices[entry.answer])}`;
    if (seen.has(key)) {
      errors.push(`${label}: 중복 문항 — ${seen.get(key)} 와 ${entry.id}`);
      continue;
    }
    seen.set(key, entry.id);
  }
}

// 1차: app/questions.ts 의 q(...) 호출을 파싱한다.
const questionSource = await readFile("app/questions.ts", "utf8");
const cha1Pattern =
  /^\s*q\(\s*"([^"]+)",\s*"[^"]*",\s*"((?:[^"\\]|\\.)*)",\s*\[((?:[^\]\\]|\\.)*)\],\s*(\d)/gm;
const cha1Entries = [...questionSource.matchAll(cha1Pattern)].map((match) => {
  const choices = [...match[3].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  return { id: match[1], question: match[2], choices, answer: Number(match[4]) };
});
const cha1Ids = [...questionSource.matchAll(/^\s*q\("([^"]+)"/gm)].map(
  (match) => match[1],
);

if (cha1Entries.length !== cha1Ids.length) {
  errors.push(
    `1차: 문항 파싱 불일치 (${cha1Entries.length}/${cha1Ids.length}) — validate 스크립트의 패턴을 확인하세요`,
  );
}

const cha1Explanations = JSON.parse(
  await readFile("app/data/explanations.json", "utf8"),
);
checkExplanations("1차", cha1Ids, cha1Explanations);
checkDuplicates("1차", cha1Entries);

// JSON 기반 분야: 데이터를 그대로 검사한다.
const jsonCategories = [
  ["2급 2차", "app/data/questions-cha2.json", "app/data/explanations-cha2.json"],
  ["1급 1차", "app/data/questions-geup1.json", "app/data/explanations-geup1.json"],
];

const summary = [`2급 1차 ${cha1Ids.length}문항`];

for (const [label, questionPath, explanationPath] of jsonCategories) {
  const entries = JSON.parse(await readFile(questionPath, "utf8"));
  const ids = entries.map((entry) => entry.id);
  const explanations = JSON.parse(await readFile(explanationPath, "utf8"));

  for (const entry of entries) {
    if (!Array.isArray(entry.choices) || entry.choices.length !== 4) {
      errors.push(`${label} ${entry.id}: 선택지가 4개가 아님`);
    }
    if (!Number.isInteger(entry.answer) || entry.answer < 0 || entry.answer > 3) {
      errors.push(`${label} ${entry.id}: 정답 인덱스가 잘못됨`);
    }
  }
  checkExplanations(label, ids, explanations);
  checkDuplicates(label, entries);
  summary.push(`${label} ${ids.length}문항`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`${summary.join(", ")}의 해설·중복 검사를 통과했습니다.`);
