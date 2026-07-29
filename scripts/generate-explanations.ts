import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { questions } from "../app/questions";
import { getQuestionExplanation } from "./explanation-generator";

const outputPath = resolve("app/data/explanations.json");
const explanations = Object.fromEntries(
  questions.map((question) => [
    question.id,
    {
      core: getQuestionExplanation(question).core,
      answerReason: getQuestionExplanation(question).answerReason,
      choiceReasons: getQuestionExplanation(question).choiceReasons,
    },
  ]),
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(explanations, null, 2)}\n`, "utf8");

console.log(`${Object.keys(explanations).length}개 문항 해설을 생성했습니다.`);
