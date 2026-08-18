"use client";

import { useCallback, useMemo, useState } from "react";
import { getQuestionExplanation, hasExplanationContent } from "./explanations";
import type { Question } from "./questions";
import {
  certifications,
  countQuestions,
  getCertification,
  getSubject,
  pickRandomQuestions,
} from "./quiz-data";

const labels = ["A", "B", "C", "D", "E", "F"];
const COUNT_OPTIONS = [10, 20, 0] as const; // 0 = 전체

type Screen = "certifications" | "subjects" | "quiz" | "result";

function sameAnswers(selected: number[], answers: number[]) {
  if (selected.length !== answers.length) return false;
  const expected = new Set(answers);
  return selected.every((index) => expected.has(index));
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("certifications");
  const [certificationKey, setCertificationKey] = useState(certifications[0].key);
  const [subjectKey, setSubjectKey] = useState(certifications[0].subjects[0].key);
  const [countOption, setCountOption] = useState<number>(20);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);

  const certification = getCertification(certificationKey);
  const total = quizQuestions.length;
  const current = quizQuestions[position];
  const requiredCount = current?.answers.length ?? 1;
  const isMultiAnswer = requiredCount > 1;
  const isCorrect = current != null && sameAnswers(selected, current.answers);
  const explanation = useMemo(
    () => (current ? getQuestionExplanation(current) : null),
    [current],
  );
  const showExplanation = isAnswered && hasExplanationContent(explanation);
  const solved = position + (isAnswered ? 1 : 0);
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  const openSubjects = useCallback((key: string) => {
    setCertificationKey(key);
    setScreen("subjects");
  }, []);

  const startQuiz = useCallback(
    (certKey: string, subjKey: string) => {
      const pool = getSubject(certKey, subjKey).questions;
      const count = countOption === 0 ? pool.length : countOption;
      setCertificationKey(certKey);
      setSubjectKey(subjKey);
      setQuizQuestions(pickRandomQuestions(pool, count));
      setPosition(0);
      setSelected([]);
      setIsAnswered(false);
      setCorrect(0);
      setScreen("quiz");
    },
    [countOption],
  );

  const grade = useCallback(
    (picks: number[]) => {
      if (!current) return;
      setIsAnswered(true);
      if (sameAnswers(picks, current.answers)) {
        setCorrect((value) => value + 1);
      }
    },
    [current],
  );

  const choose = useCallback(
    (choiceIndex: number) => {
      if (isAnswered || !current) return;

      // 단일정답 문항은 고르는 즉시 채점한다.
      if (!isMultiAnswer) {
        setSelected([choiceIndex]);
        grade([choiceIndex]);
        return;
      }

      // 복수정답 문항은 정답 개수만큼 고른 뒤 '정답 확인'을 눌러야 채점된다.
      setSelected((picks) => {
        if (picks.includes(choiceIndex)) {
          return picks.filter((index) => index !== choiceIndex);
        }
        if (picks.length >= requiredCount) return picks;
        return [...picks, choiceIndex];
      });
    },
    [current, grade, isAnswered, isMultiAnswer, requiredCount],
  );

  const moveForward = useCallback(() => {
    if (!isAnswered) return;
    if (position === total - 1) {
      setScreen("result");
      return;
    }
    setPosition((value) => value + 1);
    setSelected([]);
    setIsAnswered(false);
  }, [isAnswered, position, total]);

  const goHome = useCallback(() => {
    setScreen("certifications");
    setQuizQuestions([]);
    setSelected([]);
    setIsAnswered(false);
  }, []);

  const answerText = current
    ? current.answers
        .map((index) => `${labels[index]}. ${current.choices[index]}`)
        .join(" / ")
    : "";

  return (
    <main className="page-shell">
      <section className="quiz-wrap" aria-labelledby="quiz-title">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              $
            </span>
            <div>
              <p className="eyebrow">CERTIFICATION · RANDOM QUIZ</p>
              <h1 id="quiz-title">자격증 랜덤 퀴즈</h1>
            </div>
          </div>
          {screen === "quiz" && (
            <div
              className="score"
              aria-label={`전체 ${total}문제 중 ${solved}문제 완료`}
            >
              <span>
                {certification.label} <strong>{solved}</strong>
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
          {screen === "certifications" && (
            <section className="home-panel">
              <h2 className="home-title">어떤 자격증을 준비하세요?</h2>
              <p className="home-sub">
                기출문제가 무작위 순서로, 중복 없이 출제됩니다.
              </p>

              <div className="category-grid">
                {certifications.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className="category-card"
                    onClick={() => openSubjects(entry.key)}
                    disabled={countQuestions(entry) === 0}
                  >
                    <span className="category-eyebrow">{entry.eyebrow}</span>
                    <strong>{entry.label}</strong>
                    <p>{entry.description}</p>
                    <span className="category-count">
                      {countQuestions(entry) > 0
                        ? `${countQuestions(entry)}개 고유 문항`
                        : "준비 중"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {screen === "subjects" && (
            <section className="home-panel">
              <h2 className="home-title">{certification.label} — 어떤 과정?</h2>
              <p className="home-sub">{certification.description}</p>

              <div className="count-picker" role="group" aria-label="문항 수 선택">
                <span>문항 수</span>
                {COUNT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      countOption === option ? "count-option active" : "count-option"
                    }
                    onClick={() => setCountOption(option)}
                  >
                    {option === 0 ? "전체" : `${option}문제`}
                  </button>
                ))}
              </div>

              <div className="category-grid">
                {certification.subjects.map((subject) => (
                  <button
                    key={subject.key}
                    type="button"
                    className="category-card"
                    onClick={() => startQuiz(certification.key, subject.key)}
                    disabled={subject.questions.length === 0}
                  >
                    <span className="category-eyebrow">{subject.eyebrow}</span>
                    <strong>{subject.label}</strong>
                    <p>{subject.description}</p>
                    <span className="category-count">
                      {subject.questions.length > 0
                        ? `${subject.questions.length}개 고유 문항`
                        : "준비 중"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="actions">
                <button type="button" className="reset-button" onClick={goHome}>
                  다른 자격증 고르기
                </button>
              </div>
            </section>
          )}

          {screen === "quiz" && current && (
            <>
              <div className="question-meta">
                <div className="meta-badges">
                  <span className="question-badge">
                    {getSubject(certificationKey, subjectKey).label}
                  </span>
                  <span className="source-badge">{current.source}</span>
                </div>
                <span>
                  {position + 1} / {total}
                </span>
              </div>

              <h2 className="question-text">{current.question}</h2>

              {isMultiAnswer && (
                <p className="multi-hint" aria-live="polite">
                  <strong>{requiredCount}개</strong>를 선택한 뒤 정답 확인을 누르세요.
                  <span className="multi-count">
                    {selected.length}/{requiredCount} 선택됨
                  </span>
                </p>
              )}

              <div className="choices" role="group" aria-label="선택지">
                {current.choices.map((choice, index) => {
                  const isPicked = selected.includes(index);
                  const isAnswer = isAnswered && current.answers.includes(index);
                  const isWrong = isAnswered && isPicked && !isAnswer;
                  return (
                    <button
                      type="button"
                      className={[
                        "choice",
                        isAnswer ? "correct" : "",
                        isWrong ? "wrong" : "",
                        !isAnswered && isPicked ? "picked" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={`${current.id}-${index}`}
                      onClick={() => choose(index)}
                      disabled={isAnswered}
                      aria-pressed={isMultiAnswer ? isPicked : undefined}
                    >
                      <span className="choice-label">{labels[index]}</span>
                      <span className="choice-text">{choice}</span>
                      {isAnswer && <span className="choice-state">정답</span>}
                      {isWrong && <span className="choice-state">선택</span>}
                    </button>
                  );
                })}
              </div>

              {isMultiAnswer && !isAnswered && (
                <div className="actions">
                  <button
                    type="button"
                    className="next-button"
                    onClick={() => grade(selected)}
                    disabled={selected.length !== requiredCount}
                  >
                    정답 확인
                  </button>
                </div>
              )}

              <div
                className={`result ${isAnswered ? "visible" : ""}`}
                aria-live="polite"
              >
                {isAnswered && (
                  <>
                    <div className={`result-icon ${isCorrect ? "success" : "retry"}`}>
                      {isCorrect ? "✓" : "!"}
                    </div>
                    <div>
                      <strong>{isCorrect ? "정답입니다." : "아쉽습니다."}</strong>
                      <p>정답은 {answerText}</p>
                    </div>
                  </>
                )}
              </div>

              {showExplanation && explanation && (
                <section className="explanation-panel" aria-label="문항 해설">
                  <div className="explanation-heading">
                    <span aria-hidden="true">i</span>
                    <h3>문항 해설</h3>
                  </div>

                  {explanation.core && (
                    <div className="explanation-block">
                      <strong>핵심 개념</strong>
                      <p>{explanation.core}</p>
                    </div>
                  )}

                  {explanation.answerReason && (
                    <div className="explanation-block">
                      <strong>정답 근거</strong>
                      <p>{explanation.answerReason}</p>
                    </div>
                  )}

                  {explanation.body && (
                    <div className="explanation-block">
                      <strong>해설</strong>
                      {explanation.body.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={`${current.id}-body-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  )}

                  {explanation.choiceReasons &&
                    explanation.choiceReasons.length > 0 && (
                      <div className="explanation-block">
                        <strong>선택지별 해설</strong>
                        <ol className="choice-explanations">
                          {explanation.choiceReasons.map((reason, index) => (
                            <li
                              className={
                                current.answers.includes(index)
                                  ? "answer-explanation"
                                  : ""
                              }
                              key={`${current.id}-explanation-${index}`}
                            >
                              <span>{labels[index]}</span>
                              <p>{reason}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                  {explanation.references && explanation.references.length > 0 && (
                    <div className="explanation-block">
                      <strong>참고 자료</strong>
                      <ul className="explanation-references">
                        {explanation.references.map((url) => (
                          <li key={url}>
                            <a href={url} target="_blank" rel="noreferrer noopener">
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
              <span className="complete-badge">
                {getSubject(certificationKey, subjectKey).label} 완료
              </span>
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

              <div className="result-actions">
                <button type="button" className="reset-button" onClick={goHome}>
                  홈으로
                </button>
                <button
                  type="button"
                  className="next-button restart-cycle"
                  onClick={() => startQuiz(certificationKey, subjectKey)}
                >
                  같은 과정 다시 풀기
                  <span aria-hidden="true">↻</span>
                </button>
              </div>
            </section>
          )}
        </article>

        <p className="source-note">
          자격증별 기출문제가 중복 없이 무작위로 출제되고, 문항마다 해설을 확인할
          수 있습니다.
        </p>
      </section>
    </main>
  );
}
