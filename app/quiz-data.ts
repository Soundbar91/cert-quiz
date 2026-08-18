import { questions as cha1Questions, type Question } from "./questions";
import { cha2Questions } from "./questions-cha2";
import { geup1Questions } from "./questions-geup1";
import { saaQuestions } from "./questions-saa";

/** 자격증 안의 과목·차수 하나. 실제로 문제를 출제하는 단위다. */
export type Subject = {
  key: string;
  label: string;
  eyebrow: string;
  description: string;
  questions: Question[];
};

/** 자격증 하나. 홈 화면 1단계에서 고르는 단위다. */
export type Certification = {
  key: string;
  label: string;
  eyebrow: string;
  description: string;
  subjects: Subject[];
};

function normalize(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export function dedupeQuestions(pool: Question[]): Question[] {
  const seen = new Set<string>();
  const result: Question[] = [];
  for (const question of pool) {
    const answerText = question.answers
      .map((index) => normalize(question.choices[index] ?? ""))
      .join("|");
    const key = `${normalize(question.question)}|${answerText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }
  return result;
}

export const certifications: Certification[] = [
  {
    key: "linux-master",
    label: "리눅스마스터",
    eyebrow: "KAIT · 국가공인",
    description: "2급 1차·2차 족보와 1급 1차 기출문제",
    subjects: [
      {
        key: "cha1",
        label: "2급 1차",
        eyebrow: "리눅스 운영 및 관리 기초",
        description:
          "1차 족보 기출문제. 명령어, 계정 관리, 파티션, 부트로더, 라이선스 등",
        questions: dedupeQuestions(cha1Questions),
      },
      {
        key: "cha2",
        label: "2급 2차",
        eyebrow: "리눅스 활용",
        description:
          "2차 족보 기출문제. 파일 시스템, 셸, 프로세스, 에디터, X 윈도, 인터넷 활용 등",
        questions: dedupeQuestions(cha2Questions),
      },
      {
        key: "geup1",
        label: "1급 1차",
        eyebrow: "리눅스마스터 1급 필기",
        description:
          "2017~2023 기출 10회분. 실무의 이해, 시스템 관리, 네트워크·서비스 활용",
        questions: dedupeQuestions(geup1Questions),
      },
    ],
  },
  {
    key: "aws-saa",
    label: "AWS SAA",
    eyebrow: "Amazon Web Services",
    description: "Solutions Architect – Associate (SAA-C03) 기출문제",
    subjects: [
      {
        key: "saa-c03",
        label: "SAA-C03",
        eyebrow: "Solutions Architect – Associate",
        description:
          "한국어 기출문제. 스토리지, 컴퓨팅, 네트워킹, 보안, 비용 최적화 등 (복수정답 문항 포함)",
        questions: dedupeQuestions(saaQuestions),
      },
    ],
  },
];

export function getCertification(key: string): Certification {
  const certification = certifications.find((entry) => entry.key === key);
  if (!certification) throw new Error(`알 수 없는 자격증: ${key}`);
  return certification;
}

export function getSubject(certificationKey: string, subjectKey: string): Subject {
  const subject = getCertification(certificationKey).subjects.find(
    (entry) => entry.key === subjectKey,
  );
  if (!subject) throw new Error(`알 수 없는 과목: ${certificationKey}/${subjectKey}`);
  return subject;
}

export function countQuestions(certification: Certification): number {
  return certification.subjects.reduce(
    (total, subject) => total + subject.questions.length,
    0,
  );
}

export function pickRandomQuestions(pool: Question[], count: number): Question[] {
  const order = pool.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order.slice(0, Math.min(count, pool.length)).map((index) => pool[index]);
}
