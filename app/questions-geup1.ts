import geup1Data from "./data/questions-geup1.json";
import type { Question } from "./questions";

// 1급 1차 기출(2017~2023, 10회분)에서 추출·중복 제거한 문항.
export const geup1Questions = geup1Data as unknown as Question[];
