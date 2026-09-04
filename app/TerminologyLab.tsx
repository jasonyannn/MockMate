"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { requestAI } from "@/lib/ai-client";
import { generateStudySheet, generateTerminologyQuiz, mergeTerminologyTerms, recommendedTerminologyCategories, TERMINOLOGY_CATEGORIES } from "@/lib/terminology";
import type { Job, QuizAttempt, StudyTerm, TerminologyCategory, TerminologySheet } from "@/lib/types";

type Props = {
  job: Job;
  updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void;
  onNext: () => void;
};

type CategoryFilter = "All departments" | TerminologyCategory;
type LabMode = "study" | "quiz";
type QuizCount = 5 | 10 | 15;

const makeId = () => crypto.randomUUID();

function SourceBadge({ sheet, loading }: { sheet?: TerminologySheet; loading: boolean }) {
  if (loading) return <span className="ai-provenance is-ai">✦ Personalising…</span>;
  return sheet?.provenance.mode === "openai"
    ? <span className="ai-provenance is-ai">✦ AI · {sheet.provenance.model}</span>
    : <span className="ai-provenance is-fallback">◇ Curated glossary</span>;
}

function StudyCard({ item }: { item: StudyTerm }) {
  return <article className="term-card">
    <div className="term-card-head"><span>{item.category}</span><b aria-hidden="true">Aa</b></div>
    <h2>{item.term}</h2>
    <p className="term-definition">{item.definition}</p>
    <div className="term-practice"><small>IN PRACTICE</small><p>{item.inPractice}</p></div>
    <blockquote>{item.example}</blockquote>
    <footer><small>WHY IT MATTERS</small><p>{item.whyItMatters}</p></footer>
  </article>;
}

export function TerminologyLab({ job, updateJob, onNext }: Props) {
  const curated = useMemo(() => generateStudySheet({ title: job.title, description: job.description }), [job.title, job.description]);
  const recommended = useMemo(() => recommendedTerminologyCategories({ title: job.title, description: job.description }), [job.title, job.description]);
  const terms = useMemo(() => mergeTerminologyTerms(job.terminologySheet?.terms ?? [], curated.terms), [job.terminologySheet, curated.terms]);
  const [mode, setMode] = useState<LabMode>("study");
  const [category, setCategory] = useState<CategoryFilter>(() => recommended[0] ?? "All departments");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [count, setCount] = useState<QuizCount>(10);
  const [quizRevision, setQuizRevision] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (job.terminologySheet) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    const roleJob = { id: job.id, title: job.title, company: job.company, description: job.description, analysis: job.analysis };
    requestAI<TerminologySheet>("terminology", { job: roleJob })
      .then(({ result }) => { if (!cancelled) updateJob({ terminologySheet: result }); })
      .catch(() => { if (!cancelled) setMessage("The curated cross-department glossary is ready. AI personalisation can be retried later."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [job.id, job.title, job.company, job.description, job.analysis, job.terminologySheet, updateJob]);

  const filteredTerms = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return terms.filter((item) => (category === "All departments" || item.category === category)
      && (!needle || `${item.term} ${item.definition} ${item.inPractice} ${item.category}`.toLowerCase().includes(needle)));
  }, [terms, category, query]);

  const quizPool = useMemo(() => terms.filter((item) => category === "All departments" || item.category === category), [terms, category]);
  const quizTerms = useMemo(() => {
    if (!quizPool.length) return quizPool;
    const offset = quizRevision % quizPool.length;
    return [...quizPool.slice(offset), ...quizPool.slice(0, offset)];
  }, [quizPool, quizRevision]);
  const quizCount = Math.min(count, quizTerms.length) as QuizCount;
  const questions = useMemo(() => generateTerminologyQuiz(quizTerms, quizCount), [quizTerms, quizCount]);
  const answered = questions.filter((item) => answers[item.id] !== undefined).length;
  const correct = questions.filter((item) => answers[item.id] === item.correctIndex).length;
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;

  function resetQuiz(nextCount: QuizCount = count) {
    setCount(nextCount);
    setAnswers({});
    setFinished(false);
    setQuizRevision((value) => value + 1);
  }

  function selectCategory(next: CategoryFilter) {
    setCategory(next);
    setQuery("");
    setAnswers({});
    setFinished(false);
    setCount(next === "All departments" ? 10 : 5);
    setQuizRevision((value) => value + 1);
  }

  function finishQuiz() {
    if (!questions.length || answered < questions.length) return;
    const attempt: QuizAttempt = { id: makeId(), score, correct, total: questions.length, createdAt: new Date().toISOString() };
    updateJob({ terminologyQuizAttempts: [...(job.terminologyQuizAttempts ?? []), attempt] });
    setFinished(true);
  }

  async function refreshTerms() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const roleJob = { id: job.id, title: job.title, company: job.company, description: job.description, analysis: job.analysis };
      const { result } = await requestAI<TerminologySheet>("terminology", { job: roleJob });
      updateJob({ terminologySheet: result });
      setMessage(result.provenance.mode === "openai" ? "Study sheet refreshed for this role." : "Curated glossary refreshed.");
    } catch {
      setMessage("The curated glossary remains available; AI personalisation could not be refreshed.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <div className="terminology-toolbar panel">
      <div className="knowledge-tabs" role="tablist" aria-label="Terminology learning mode">
        <button role="tab" aria-selected={mode === "study"} className={mode === "study" ? "active" : ""} onClick={() => setMode("study")}><span>▤</span> Study sheet</button>
        <button role="tab" aria-selected={mode === "quiz"} className={mode === "quiz" ? "active" : ""} onClick={() => setMode("quiz")}><span>◇</span> Test me</button>
      </div>
      <div className="terminology-actions"><SourceBadge sheet={job.terminologySheet} loading={loading} /><button className="text-button" disabled={loading} onClick={() => void refreshTerms()}>↻ Personalise for this role</button></div>
    </div>

    <section className="term-category-section" aria-label="Terminology categories">
      <div className="term-category-intro"><div><span className="overline">CHOOSE A DEPARTMENT</span><h2>Learn the language behind the work.</h2></div><p>Recommended for {job.title || "your role"}: <b>{recommended.join(" · ")}</b></p></div>
      <div className="term-category-scroll">
        <button className={category === "All departments" ? "active" : ""} onClick={() => selectCategory("All departments")}><b>All</b><span>{terms.length} terms</span></button>
        {TERMINOLOGY_CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => selectCategory(item)}><b>{recommended.includes(item) ? "✦ " : ""}{item}</b><span>{terms.filter((term) => term.category === item).length} terms</span></button>)}
      </div>
    </section>

    {message && <p className="term-message" role="status">{message}</p>}

    {mode === "study" ? <>
      <div className="term-list-head"><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a term, definition or department…" aria-label="Search study terms" /></label><span>{filteredTerms.length} term{filteredTerms.length === 1 ? "" : "s"}</span></div>
      <div className="term-study-grid">{filteredTerms.map((item) => <StudyCard key={item.id} item={item} />)}{!filteredTerms.length && <div className="empty-state term-empty"><span>⌕</span><h2>No matching terms</h2><p>Try a broader search or choose another department.</p></div>}</div>
      <div className="stage-next"><div><span>READY TO RECALL IT?</span><b>Turn this study sheet into a short knowledge check.</b></div><button className="button button-primary" onClick={() => { setMode("quiz"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Test these terms <span>→</span></button></div>
    </> : !finished ? <div className="quiz-layout terminology-quiz-layout">
      <section className="quiz-progress-panel"><div className="quiz-progress-ring" style={{ "--progress": Math.round((answered / Math.max(1, questions.length)) * 100) } as CSSProperties}><strong>{answered}</strong><span>/ {questions.length}</span></div><h3>Your terminology check</h3><p>Choose the plain-English meaning. The explanation appears immediately.</p><div className="count-picker"><span>Questions</span>{([5, 10, 15] as const).map((value) => <button key={value} disabled={quizPool.length < value} className={count === value ? "active" : ""} onClick={() => resetQuiz(value)}>{value}</button>)}</div><div className="quiz-dots">{questions.map((question, index) => <button key={question.id} className={answers[question.id] !== undefined ? answers[question.id] === question.correctIndex ? "correct" : "wrong" : ""} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{index + 1}</button>)}</div><button className="button button-primary" disabled={answered < questions.length} onClick={finishQuiz}>Complete quiz →</button></section>
      <section className="quiz-questions">{questions.map((question, questionIndex) => { const choice = answers[question.id]; return <article key={question.id} id={question.id} className={choice !== undefined ? "answered" : ""}><div className="quiz-number">{String(questionIndex + 1).padStart(2, "0")}</div><span className="term-question-category">{question.category}</span><h2>{question.prompt}</h2><div className="quiz-options">{question.options.map((option, optionIndex) => <button key={`${question.id}-${optionIndex}`} disabled={choice !== undefined} className={choice !== undefined ? optionIndex === question.correctIndex ? "correct" : optionIndex === choice ? "wrong" : "muted" : ""} onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}<i>{choice !== undefined && optionIndex === question.correctIndex ? "✓" : choice === optionIndex ? "×" : ""}</i></button>)}</div>{choice !== undefined && <div className={choice === question.correctIndex ? "explanation correct" : "explanation"}><b>{choice === question.correctIndex ? "✓ Correct" : `The best answer is ${String.fromCharCode(65 + question.correctIndex)}`}</b><p>{question.explanation}</p></div>}</article>; })}</section>
    </div> : <section className="quiz-summary"><span className="celebration">✦</span><p className="overline">TERMINOLOGY CHECK COMPLETE</p><h1>{score >= 80 ? "You can speak the language." : "A useful first pass."}</h1><div className="summary-score"><strong>{score}</strong><span>/ 100</span></div><p>You answered <b>{correct} of {questions.length}</b> questions correctly. {score >= 80 ? "Try another department to build cross-functional range." : "Return to the study sheet, review the examples, then try again."}</p><div><button className="button button-soft" onClick={() => { setFinished(false); setMode("study"); }}>Review study sheet</button><button className="button button-soft" onClick={() => resetQuiz()}>↻ Try again</button><button className="button button-primary" onClick={onNext}>Build evidence bank →</button></div></section>}

    {mode === "quiz" && !finished && <div className="stage-next"><div><span>YOUR HISTORY</span><b>{job.terminologyQuizAttempts?.length ? `Latest terminology score: ${job.terminologyQuizAttempts.at(-1)?.score}%` : "Complete your first terminology check to save a score."}</b></div><button className="button button-soft" onClick={onNext}>Skip to evidence bank →</button></div>}
  </>;
}
