"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getQuestionExplanation } from "./explanations";
import { questions } from "./questions";

const labels = ["A", "B", "C", "D"];
const initialOrder = questions.map((_, index) => index);

function shuffledOrder() {
  const order = [...initialOrder];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

export default function Home() {
  const [order, setOrder] = useState(initialOrder);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[order[position]];
  const isAnswered = selected !== null;
  const isCorrect = selected === current.answer;
  const explanation = useMemo(() => getQuestionExplanation(current), [current]);
  const solved = finished ? questions.length : position + (isAnswered ? 1 : 0);
  const score = useMemo(
    () => (finished ? Math.round((correct / questions.length) * 100) : 0),
    [correct, finished],
  );

  useEffect(() => {
    setOrder(shuffledOrder());
  }, []);

  const choose = useCallback(
    (choiceIndex: number) => {
      if (isAnswered || finished) return;
      setSelected(choiceIndex);
      if (choiceIndex === current.answer) {
        setCorrect((value) => value + 1);
      }
    },
    [current.answer, finished, isAnswered],
  );

  const moveForward = useCallback(() => {
    if (!isAnswered) return;
    if (position === questions.length - 1) {
      setFinished(true);
      return;
    }
    setPosition((value) => value + 1);
    setSelected(null);
  }, [isAnswered, position]);

  const restartCycle = useCallback(() => {
    setOrder(shuffledOrder());
    setPosition(0);
    setSelected(null);
    setCorrect(0);
    setFinished(false);
  }, []);

  return (
    <main className="page-shell">
      <section className="quiz-wrap" aria-labelledby="quiz-title">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              $
            </span>
            <div>
              <p className="eyebrow">LINUX MASTER · FULL CYCLE QUIZ</p>
              <h1 id="quiz-title">리눅스 마스터 2급</h1>
            </div>
          </div>
          <div
            className="score"
            aria-label={`전체 ${questions.length}문제 중 ${solved}문제 완료`}
          >
            <span>
              {finished ? "완료" : "진행"} <strong>{solved}</strong>
            </span>
            <span className="score-divider" />
            <span>전체 {questions.length}</span>
            <span className="score-rate">
              {Math.round((solved / questions.length) * 100)}%
            </span>
          </div>
        </header>

        <div className="cycle-progress" aria-hidden="true">
          <span style={{ width: `${(solved / questions.length) * 100}%` }} />
        </div>

        <article className="quiz-card">
          {finished ? (
            <section className="final-result" aria-live="polite">
              <span className="complete-badge">한 사이클 완료</span>
              <h2>{questions.length}문제를 모두 풀었습니다.</h2>
              <p className="final-message">
                이번 사이클의 최종 결과입니다. 새 사이클을 시작하면 문제 순서가
                다시 무작위로 섞입니다.
              </p>

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
                  <strong>{questions.length - correct}개</strong>
                </div>
              </div>

              <button type="button" className="next-button restart-cycle" onClick={restartCycle}>
                새 사이클 시작
                <span aria-hidden="true">↻</span>
              </button>
            </section>
          ) : (
            <>
              <div className="question-meta">
                <div className="meta-badges">
                  <span className="question-badge">{current.source}</span>
                  {current.revised && <span className="revised-badge">교정 문항</span>}
                </div>
                <span>
                  {position + 1} / {questions.length}
                </span>
              </div>

              <h2>{current.question}</h2>

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
                      <span>{choice}</span>
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

              {isAnswered && (
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

                  {current.revised && (
                    <p className="revision-note">
                      원본 족보의 오탈자, 오래된 환경 또는 정답이 어긋난 표현을 현재
                      기준에 맞게 교정한 문항입니다.
                    </p>
                  )}
                </section>
              )}

              <div className="actions">
                <button type="button" className="reset-button" onClick={restartCycle}>
                  사이클 다시 시작
                </button>
                <button
                  type="button"
                  className="next-button"
                  onClick={moveForward}
                  disabled={!isAnswered}
                >
                  {position === questions.length - 1 ? "최종 결과 확인" : "다음 문제"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          )}
        </article>

        <p className="source-note">
          한 사이클에 {questions.length}개 고유 문항이 중복 없이 한 번씩 출제됩니다.
        </p>
      </section>
    </main>
  );
}
