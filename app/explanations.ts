import explanationData from "./data/explanations.json";
import type { Question } from "./questions";

export type QuestionExplanation = {
  core: string;
  answerReason: string;
  choiceReasons: [string, string, string, string];
};

const explanations = explanationData as Record<string, QuestionExplanation>;

export function getQuestionExplanation(question: Question): QuestionExplanation {
  const explanation = explanations[question.id];

  if (!explanation) {
    throw new Error(`문항 ${question.id}의 해설 데이터가 없습니다.`);
  }

  return explanation;
}
