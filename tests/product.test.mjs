import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import { keywordCoverage, scoreAnswerCore } from "../lib/scoring-core.ts";
import { extractLinkedInArchiveText, extractRtfText } from "../lib/document-extract.ts";
import { analyseCandidate, coachAnswer, generateInterviewQuestions, generateQuiz } from "../lib/ai-service.ts";
import { readPreferences } from "../lib/preferences.ts";

const resume = "Led AI product strategy and customer discovery. Increased adoption by 31% and worked cross-functionally with engineering and design.";
const description = "Lead AI product strategy, customer discovery, cross-functional delivery, analytics and executive communication.";
const job = {
  id: "job-test", title: "Senior Product Manager", company: "Test Co", description,
  resume: { id: "doc", filename: "resume.txt", contentType: "text/plain", storageKey: "test", extractedText: resume, characterCount: resume.length, status: "extracted" },
  coverLetterText: "I lead measurable customer outcomes.", portfolioUrl: "", linkedinProfileText: "", linkedinDocuments: [], analysis: null,
};

test("keyword coverage and answer scoring are reproducible", () => {
  assert.ok(keywordCoverage(resume, description) > 20);
  const answer = "The situation was falling adoption. My task was to understand why. I interviewed customers, then led the roadmap change. The result was a 31% increase in adoption.";
  assert.deepEqual(scoreAnswerCore(answer, "Tell me about customer discovery"), scoreAnswerCore(answer, "Tell me about customer discovery"));
  assert.ok(scoreAnswerCore(answer, "Tell me about customer discovery").total >= 70);
});

test("analysis degrades LinkedIn reputation instead of inventing a score", () => {
  const result = analyseCandidate(job);
  assert.equal(result.reputationScore, null);
  assert.ok(result.alignmentScore >= 50 && result.alignmentScore <= 100);
  assert.ok(result.requirements.length >= 3);
});

test("question and quiz generators honour product counts", () => {
  const analysedJob = { ...job, analysis: analyseCandidate(job) };
  const questions = generateInterviewQuestions(analysedJob);
  assert.equal(questions.length, 112);
  assert.equal(new Set(questions.map((question) => question.id)).size, 112);
  assert.equal(generateQuiz(analysedJob, 5).length, 5);
  assert.equal(generateQuiz(analysedJob, 15).length, 15);
});

test("coaching identifies quantified, structured answers", () => {
  const question = generateInterviewQuestions({ ...job, analysis: analyseCandidate(job) })[0];
  const strong = coachAnswer("The situation was low adoption. My task was to find the cause. I interviewed 12 customers and led two experiments. The result was a 24% lift in weekly use.", question, job);
  const weak = coachAnswer("I am good at this and enjoy working with teams.", question, job);
  assert.ok(strong.score > weak.score);
  assert.equal(strong.breakdown.length, 4);
});

test("RTF extraction preserves human-readable text", () => {
  assert.match(extractRtfText("{\\rtf1\\ansi Hello\\par World}"), /Hello\nWorld/);
});

test("LinkedIn archives extract professional activity and ignore private messages", () => {
  const encoder = new TextEncoder();
  const archive = zipSync({
    "Shares.csv": encoder.encode("Date,ShareCommentary\n2026-01-01,Led a product strategy workshop"),
    "Comments.csv": encoder.encode("Date,Comment\n2026-01-02,Great customer discovery example"),
    "messages.csv": encoder.encode("Secret private conversation"),
  });
  const extracted = extractLinkedInArchiveText(archive);
  assert.match(extracted, /product strategy workshop/);
  assert.match(extracted, /customer discovery example/);
  assert.doesNotMatch(extracted, /private conversation/);
});

test("accessibility preferences safely merge with defaults", () => {
  const preferences = readPreferences(JSON.stringify({ highContrast: true, practiceLanguage: "fr-FR" }));
  assert.equal(preferences.highContrast, true);
  assert.equal(preferences.practiceLanguage, "fr-FR");
  assert.equal(preferences.enhancedFocus, true);
  assert.equal(readPreferences("not-json").practiceLanguage, "en-AU");
});
