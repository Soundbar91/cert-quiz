import { readFile } from "node:fs/promises";

const questionSource = await readFile("app/questions.ts", "utf8");
const explanationSource = await readFile("app/data/explanations.json", "utf8");
const explanations = JSON.parse(explanationSource);
const questionIds = [...questionSource.matchAll(/^\s*q\("([^"]+)"/gm)].map(
  (match) => match[1],
);
const explanationIds = Object.keys(explanations);
const errors = [];

for (const id of questionIds) {
  const explanation = explanations[id];
  if (!explanation) {
    errors.push(`${id}: 해설 없음`);
    continue;
  }
  if (explanation.core.length < 30) errors.push(`${id}: 핵심 개념이 너무 짧음`);
  if (explanation.answerReason.length < 25) errors.push(`${id}: 정답 근거가 너무 짧음`);
  if (!Array.isArray(explanation.choiceReasons) || explanation.choiceReasons.length !== 4) {
    errors.push(`${id}: 선택지 해설이 4개가 아님`);
  }
}

for (const id of explanationIds) {
  if (!questionIds.includes(id)) errors.push(`${id}: 대응 문항이 없는 해설`);
}

if (new Set(questionIds).size !== questionIds.length) errors.push("문항 ID 중복");
if (questionIds.length !== explanationIds.length) {
  errors.push(`문항 ${questionIds.length}개와 해설 ${explanationIds.length}개가 일치하지 않음`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`${questionIds.length}개 문항의 JSON 해설이 모두 연결됐습니다.`);
