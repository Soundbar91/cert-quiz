import cha2Data from "./data/questions-cha2.json";
import { normalizeQuestions, type RawQuestion } from "./questions";

// 2차 족보(리눅스마스터2급 2차 족보.pdf)에서 추출·중복 제거한 문항.
export const cha2Questions = normalizeQuestions(
  cha2Data as unknown as RawQuestion[],
);
