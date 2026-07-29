"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getQuestionExplanation } from "./explanations";
import type { Question } from "./questions";
import {
  categories,
  getCategory,
  pickRandomQuestions,
  type CategoryKey,
} from "./quiz-data";

const labels = ["A", "B", "C", "D"];
const COUNT_OPTIONS = [10, 20, 0] as const; // 0 = 전체

type RankingRow = {
  id: number;
  name: string;
  correct: number;
  total: number;
  percent: number;
  createdAt: string;
};

type Screen = "home" | "quiz" | "result";

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

async function fetchRankings(category: CategoryKey): Promise<RankingRow[]> {
  const response = await fetch(`/api/rankings?category=${category}`);
  const payload = (await response.json()) as { rankings?: RankingRow[]; error?: string };
  if (!response.ok || !payload.rankings) {
    throw new Error(payload.error ?? "랭킹을 불러오지 못했습니다.");
  }
  return payload.rankings;
}

function RankingTable({
  rows,
  highlightId,
  emptyMessage,
}: {
  rows: RankingRow[];
  highlightId?: number | null;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="ranking-empty">{emptyMessage}</p>;
  }

  return (
    <ol className="ranking-list">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className={highlightId === row.id ? "ranking-row highlight" : "ranking-row"}
        >
          <span className={`rank-no ${index < 3 ? "top" : ""}`}>{index + 1}</span>
          <span className="rank-name">{row.name}</span>
          <span className="rank-score">
            {row.percent}점
            <small>
              {row.correct}/{row.total}
            </small>
          </span>
          <span className="rank-date">{formatDate(row.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [categoryKey, setCategoryKey] = useState<CategoryKey>("cha1");
  const [countOption, setCountOption] = useState<number>(20);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const [homeRankings, setHomeRankings] = useState<
    Partial<Record<CategoryKey, RankingRow[]>>
  >({});
  const [rankingError, setRankingError] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<number | null>(null);
  const [resultRankings, setResultRankings] = useState<RankingRow[] | null>(null);

  const category = getCategory(categoryKey);
  const total = quizQuestions.length;
  const current = quizQuestions[position];
  const isAnswered = selected !== null;
  const isCorrect = current != null && selected === current.answer;
  const explanation = useMemo(
    () => (current ? getQuestionExplanation(current) : null),
    [current],
  );
  const solved = position + (isAnswered ? 1 : 0);
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  const loadHomeRankings = useCallback(() => {
    Promise.all(
      categories.map(async (entry) => {
        const rows = await fetchRankings(entry.key);
        return [entry.key, rows] as const;
      }),
    )
      .then((pairs) => {
        setHomeRankings(Object.fromEntries(pairs));
        setRankingError(null);
      })
      .catch((error: unknown) => {
        setRankingError(
          error instanceof Error ? error.message : "랭킹을 불러오지 못했습니다.",
        );
      });
  }, []);

  useEffect(() => {
    loadHomeRankings();
  }, [loadHomeRankings]);

  const startQuiz = useCallback(
    (key: CategoryKey) => {
      const pool = getCategory(key).questions;
      const count = countOption === 0 ? pool.length : countOption;
      setCategoryKey(key);
      setQuizQuestions(pickRandomQuestions(pool, count));
      setPosition(0);
      setSelected(null);
      setCorrect(0);
      setRegisteredId(null);
      setResultRankings(null);
      setSubmitError(null);
      setScreen("quiz");
    },
    [countOption],
  );

  const choose = useCallback(
    (choiceIndex: number) => {
      if (isAnswered || !current) return;
      setSelected(choiceIndex);
      if (choiceIndex === current.answer) {
        setCorrect((value) => value + 1);
      }
    },
    [current, isAnswered],
  );

  const moveForward = useCallback(() => {
    if (!isAnswered) return;
    if (position === total - 1) {
      setScreen("result");
      return;
    }
    setPosition((value) => value + 1);
    setSelected(null);
  }, [isAnswered, position, total]);

  const goHome = useCallback(() => {
    setScreen("home");
    setQuizQuestions([]);
    setSelected(null);
    loadHomeRankings();
  }, [loadHomeRankings]);

  const registerRanking = useCallback(async () => {
    const name = playerName.trim();
    if (!name) {
      setSubmitError("이름을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/rankings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, category: categoryKey, correct, total }),
      });
      const payload = (await response.json()) as {
        entry?: RankingRow;
        rankings?: RankingRow[];
        error?: string;
      };
      if (!response.ok || !payload.entry || !payload.rankings) {
        throw new Error(payload.error ?? "랭킹 등록에 실패했습니다.");
      }
      setRegisteredId(payload.entry.id);
      setResultRankings(payload.rankings);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "랭킹 등록에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [categoryKey, correct, playerName, total]);

  return (
    <main className="page-shell">
      <section className="quiz-wrap" aria-labelledby="quiz-title">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              $
            </span>
            <div>
              <p className="eyebrow">LINUX MASTER · RANDOM QUIZ</p>
              <h1 id="quiz-title">리눅스 마스터 2급</h1>
            </div>
          </div>
          {screen === "quiz" && (
            <div
              className="score"
              aria-label={`전체 ${total}문제 중 ${solved}문제 완료`}
            >
              <span>
                {category.label} <strong>{solved}</strong>
              </span>
              <span className="score-divider" />
              <span>전체 {total}</span>
              <span className="score-rate">
                {total > 0 ? Math.round((solved / total) * 100) : 0}%
              </span>
            </div>
          )}
        </header>

        {screen === "quiz" && (
          <div className="cycle-progress" aria-hidden="true">
            <span style={{ width: `${total > 0 ? (solved / total) * 100 : 0}%` }} />
          </div>
        )}

        <article className="quiz-card">
          {screen === "home" && (
            <section className="home-panel">
              <h2 className="home-title">어떤 분야를 공부할까요?</h2>
              <p className="home-sub">
                족보 기출문제가 무작위 순서로, 중복 없이 출제됩니다.
              </p>

              <div className="count-picker" role="group" aria-label="문항 수 선택">
                <span>문항 수</span>
                {COUNT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={countOption === option ? "count-option active" : "count-option"}
                    onClick={() => setCountOption(option)}
                  >
                    {option === 0 ? "전체" : `${option}문제`}
                  </button>
                ))}
              </div>

              <div className="category-grid">
                {categories.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className="category-card"
                    onClick={() => startQuiz(entry.key)}
                    disabled={entry.questions.length === 0}
                  >
                    <span className="category-eyebrow">{entry.eyebrow}</span>
                    <strong>{entry.label}</strong>
                    <p>{entry.description}</p>
                    <span className="category-count">
                      {entry.questions.length > 0
                        ? `${entry.questions.length}개 고유 문항`
                        : "준비 중"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="home-rankings">
                {categories.map((entry) => (
                  <section key={entry.key} className="ranking-panel">
                    <h3>{entry.label} 랭킹 TOP 20</h3>
                    {rankingError ? (
                      <p className="ranking-empty">{rankingError}</p>
                    ) : (
                      <RankingTable
                        rows={homeRankings[entry.key] ?? []}
                        emptyMessage={
                          homeRankings[entry.key]
                            ? "아직 등록된 기록이 없습니다. 첫 주인공이 되어 보세요!"
                            : "랭킹을 불러오는 중..."
                        }
                      />
                    )}
                  </section>
                ))}
              </div>
            </section>
          )}

          {screen === "quiz" && current && (
            <>
              <div className="question-meta">
                <div className="meta-badges">
                  <span className="question-badge">{category.label}</span>
                  <span className="source-badge">{current.source}</span>
                </div>
                <span>
                  {position + 1} / {total}
                </span>
              </div>

              <h2 className="question-text">{current.question}</h2>

              <div className="choices" role="group" aria-label="선택지">
                {current.choices.map((choice, index) => {
                  const isAnswer = isAnswered && index === current.answer;
                  const isWrong = isAnswered && index === selected && !isCorrect;
                  return (
                    <button
                      type="button"
                      className={`choice ${isAnswer ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                      key={`${current.id}-${index}`}
                      onClick={() => choose(index)}
                      disabled={isAnswered}
                    >
                      <span className="choice-label">{labels[index]}</span>
                      <span className="choice-text">{choice}</span>
                      {isAnswer && <span className="choice-state">정답</span>}
                      {isWrong && <span className="choice-state">선택</span>}
                    </button>
                  );
                })}
              </div>

              <div className={`result ${isAnswered ? "visible" : ""}`} aria-live="polite">
                {isAnswered && (
                  <>
                    <div className={`result-icon ${isCorrect ? "success" : "retry"}`}>
                      {isCorrect ? "✓" : "!"}
                    </div>
                    <div>
                      <strong>{isCorrect ? "정답입니다." : "아쉽습니다."}</strong>
                      <p>
                        정답은 {labels[current.answer]}. {current.choices[current.answer]}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {isAnswered && explanation && (
                <section className="explanation-panel" aria-label="문항 해설">
                  <div className="explanation-heading">
                    <span aria-hidden="true">i</span>
                    <h3>문항 해설</h3>
                  </div>

                  <div className="explanation-block">
                    <strong>핵심 개념</strong>
                    <p>{explanation.core}</p>
                  </div>

                  <div className="explanation-block">
                    <strong>정답 근거</strong>
                    <p>{explanation.answerReason}</p>
                  </div>

                  <div className="explanation-block">
                    <strong>선택지별 해설</strong>
                    <ol className="choice-explanations">
                      {explanation.choiceReasons.map((reason, index) => (
                        <li
                          className={index === current.answer ? "answer-explanation" : ""}
                          key={`${current.id}-explanation-${index}`}
                        >
                          <span>{labels[index]}</span>
                          <p>{reason}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              <div className="actions">
                <button type="button" className="reset-button" onClick={goHome}>
                  그만두고 홈으로
                </button>
                <button
                  type="button"
                  className="next-button"
                  onClick={moveForward}
                  disabled={!isAnswered}
                >
                  {position === total - 1 ? "최종 결과 확인" : "다음 문제"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          )}

          {screen === "result" && (
            <section className="final-result" aria-live="polite">
              <span className="complete-badge">{category.label} 완료</span>
              <h2>{total}문제를 모두 풀었습니다.</h2>

              <div className="result-grid">
                <div>
                  <span>최종 점수</span>
                  <strong>{score}점</strong>
                </div>
                <div>
                  <span>정답</span>
                  <strong>{correct}개</strong>
                </div>
                <div>
                  <span>오답</span>
                  <strong>{total - correct}개</strong>
                </div>
              </div>

              {registeredId == null ? (
                <div className="name-form">
                  <p>이름을 등록하면 {category.label} 랭킹에 기록됩니다.</p>
                  <div className="name-row">
                    <input
                      type="text"
                      value={playerName}
                      maxLength={12}
                      placeholder="이름 (최대 12자)"
                      onChange={(event) => setPlayerName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !submitting) registerRanking();
                      }}
                    />
                    <button
                      type="button"
                      className="next-button"
                      onClick={registerRanking}
                      disabled={submitting}
                    >
                      {submitting ? "등록 중..." : "랭킹 등록"}
                    </button>
                  </div>
                  {submitError && <p className="form-error">{submitError}</p>}
                </div>
              ) : (
                <section className="ranking-panel result-ranking">
                  <h3>{category.label} 랭킹 TOP 20</h3>
                  <RankingTable
                    rows={resultRankings ?? []}
                    highlightId={registeredId}
                    emptyMessage="아직 등록된 기록이 없습니다."
                  />
                </section>
              )}

              <div className="result-actions">
                <button
                  type="button"
                  className="reset-button"
                  onClick={goHome}
                >
                  홈으로
                </button>
                <button
                  type="button"
                  className="next-button restart-cycle"
                  onClick={() => startQuiz(categoryKey)}
                >
                  같은 분야 다시 풀기
                  <span aria-hidden="true">↻</span>
                </button>
              </div>
            </section>
          )}
        </article>

        <p className="source-note">
          리눅스 마스터 2급 1차·2차 족보 기출문제가 중복 없이 무작위로 출제됩니다.
        </p>
      </section>
    </main>
  );
}
