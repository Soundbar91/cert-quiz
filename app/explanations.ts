import cha1ExplanationData from "./data/explanations.json";
import cha2ExplanationData from "./data/explanations-cha2.json";
import geup1ExplanationData from "./data/explanations-geup1.json";
import type { Question } from "./questions";

export type QuestionExplanation = {
  core: string;
  answerReason: string;
  choiceReasons: [string, string, string, string];
};

const explanations = {
  ...(cha1ExplanationData as unknown as Record<string, QuestionExplanation>),
  ...(cha2ExplanationData as unknown as Record<string, QuestionExplanation>),
  ...(geup1ExplanationData as unknown as Record<string, QuestionExplanation>),
};

export function getQuestionExplanation(
  question: Question,
): QuestionExplanation | null {
  return explanations[question.id] ?? null;
}
