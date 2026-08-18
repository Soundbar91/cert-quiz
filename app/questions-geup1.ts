import geup1Data from "./data/questions-geup1.json";
import { normalizeQuestions, type RawQuestion } from "./questions";

// 1급 1차 기출(2017~2023, 10회분)에서 추출·중복 제거한 문항.
export const geup1Questions = normalizeQuestions(
  geup1Data as unknown as RawQuestion[],
);
