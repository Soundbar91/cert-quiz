import cha1ExplanationData from "./data/explanations.json";
import cha2ExplanationData from "./data/explanations-cha2.json";
import geup1ExplanationData from "./data/explanations-geup1.json";
import saaExplanationData from "./data/explanations-saa.json";
import type { Question } from "./questions";

/**
 * 해설은 자격증마다 원본 형태가 다르다.
 *
 * - 리눅스마스터: 직접 작성한 구조형 해설(핵심 개념 / 정답 근거 / 선택지별)
 * - AWS SAA: 원본 PDF의 서술형 해설 + 참고 문서 링크
 *
 * 모든 필드를 선택적으로 두고 UI 는 존재하는 것만 렌더링한다.
 */
export type QuestionExplanation = {
  core?: string;
  answerReason?: string;
  choiceReasons?: string[];
  body?: string;
  references?: string[];
};

const explanations: Record<string, QuestionExplanation> = {
  ...(cha1ExplanationData as unknown as Record<string, QuestionExplanation>),
  ...(cha2ExplanationData as unknown as Record<string, QuestionExplanation>),
  ...(geup1ExplanationData as unknown as Record<string, QuestionExplanation>),
  ...(saaExplanationData as unknown as Record<string, QuestionExplanation>),
};

export function hasExplanationContent(
  explanation: QuestionExplanation | null,
): explanation is QuestionExplanation {
  if (!explanation) return false;
  return Boolean(
    explanation.core ||
      explanation.answerReason ||
      explanation.body ||
      explanation.choiceReasons?.length ||
      explanation.references?.length,
  );
}

export function getQuestionExplanation(
  question: Question,
): QuestionExplanation | null {
  return explanations[question.id] ?? null;
}
