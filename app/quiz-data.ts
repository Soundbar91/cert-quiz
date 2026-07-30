import { questions as cha1Questions, type Question } from "./questions";
import { cha2Questions } from "./questions-cha2";
import { geup1Questions } from "./questions-geup1";

export type CategoryKey = "cha1" | "cha2" | "geup1";

export type Category = {
  key: CategoryKey;
  label: string;
  eyebrow: string;
  description: string;
  questions: Question[];
};

function normalize(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export function dedupeQuestions(pool: Question[]): Question[] {
  const seen = new Set<string>();
  const result: Question[] = [];
  for (const question of pool) {
    const key = `${normalize(question.question)}|${normalize(question.choices[question.answer])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }
  return result;
}

export const categories: Category[] = [
  {
    key: "cha1",
    label: "2급 1차",
    eyebrow: "리눅스 운영 및 관리 기초",
    description: "1차 족보 기출문제. 명령어, 계정 관리, 파티션, 부트로더, 라이선스 등",
    questions: dedupeQuestions(cha1Questions),
  },
  {
    key: "cha2",
    label: "2급 2차",
    eyebrow: "리눅스 활용",
    description: "2차 족보 기출문제. 파일 시스템, 셸, 프로세스, 에디터, X 윈도, 인터넷 활용 등",
    questions: dedupeQuestions(cha2Questions),
  },
  {
    key: "geup1",
    label: "1급 1차",
    eyebrow: "리눅스마스터 1급 필기",
    description: "2017~2023 기출 10회분. 실무의 이해, 시스템 관리, 네트워크·서비스 활용",
    questions: dedupeQuestions(geup1Questions),
  },
];

export function getCategory(key: CategoryKey): Category {
  const category = categories.find((entry) => entry.key === key);
  if (!category) throw new Error(`알 수 없는 분야: ${key}`);
  return category;
}

export function pickRandomQuestions(pool: Question[], count: number): Question[] {
  const order = pool.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order.slice(0, Math.min(count, pool.length)).map((index) => pool[index]);
}
