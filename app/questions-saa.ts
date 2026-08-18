import saaData from "./data/questions-saa.json";
import { normalizeQuestions, type RawQuestion } from "./questions";

// SAA-C03 기출(Examtopics V18.35)에서 추출한 문항. 이미지 지문·이미지
// 선택지로만 제시되어 자체 완결되지 않는 문항은 제외했다.
// 데이터 재생성: python3 scripts/extract-saa.py
export const saaQuestions = normalizeQuestions(
  saaData as unknown as RawQuestion[],
);
