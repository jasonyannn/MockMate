import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import { coachScoreLabel, keywordCoverage, scoreAnswerCore } from "../lib/scoring-core.ts";
import { extractLinkedInArchiveText, extractRtfText } from "../lib/document-extract.ts";
import { analyseCandidate, coachAnswer, generateInterviewQuestions, generateQuiz } from "../lib/ai-service.ts";
import { readPreferences } from "../lib/preferences.ts";
import { documentDisplayName, normalizeDocumentLibrary } from "../lib/document-library.ts";
import { generateStudySheet, generateTerminologyQuiz, recommendedTerminologyCategories, TERMINOLOGY_CATEGORIES } from "../lib/terminology.ts";

const resume = "Led AI product strategy and customer discovery. Increased adoption by 31% and worked cross-functionally with engineering and design.";
const description = "Lead AI product strategy, customer discovery, cross-functional delivery, analytics and executive communication.";
const job = {
  id: "job-test", title: "Senior Product Manager", company: "Test Co", description,
  resume: { id: "doc", filename: "resume.txt", contentType: "text/plain", storageKey: "test", extractedText: resume, characterCount: resume.length, status: "extracted" },
  coverLetterText: "I lead measurable customer outcomes.", portfolioUrl: "", linkedinProfileText: "", linkedinDocuments: [], analysis: null,
};

test("keyword coverage and answer scoring are reproducible", () => {
  assert.ok(keywordCoverage(resume, description) > 20);
  const answer = "At Northstar, our product roadmap was overloaded with sales requests while retention was falling. I was accountable for resetting product strategy without delaying a committed launch. I interviewed 12 customers, analysed usage data, and led engineering, design and sales through a prioritisation workshop. I decided to remove two low-evidence features and redirect the team toward onboarding reliability. Within one quarter, activation increased by 24%, support tickets fell by 18%, and we launched on schedule. The lesson was to make evidence and trade-offs visible before urgency turned into poor strategy.";
  assert.deepEqual(scoreAnswerCore(answer, "Tell me about customer discovery"), scoreAnswerCore(answer, "Tell me about customer discovery"));
  assert.ok(scoreAnswerCore(answer, "Tell me about a time you demonstrated product strategy under pressure").total >= 85);
});

test("coach scoring is behaviorally anchored and rejects non-answers", () => {
  const question = "Tell me about a time you demonstrated product strategy under pressure";
  const greeting = scoreAnswerCore("Hi my name is Jason hello my name is Jason", question);
  const repeated = scoreAnswerCore("Product strategy is important product strategy is important", question);
  const partial = scoreAnswerCore("The situation was falling adoption. My task was to understand why. I interviewed customers, changed the roadmap, and adoption increased 31%.", question);
  const strong = scoreAnswerCore("At Northstar, our roadmap was overloaded while retention was falling. I was accountable for resetting product strategy without delaying launch. I interviewed 12 customers, analysed usage data, and led engineering, design and sales through a prioritisation workshop. I decided to remove two low-evidence features and redirect the team toward onboarding reliability. Within one quarter, activation increased by 24%, support tickets fell by 18%, and we launched on schedule. I learned to make evidence and trade-offs visible before urgency turns into poor strategy.", question);
  assert.deepEqual(greeting, { relevance: 0, structure: 0, evidence: 0, concision: 0, total: 0, wordCount: 10, classification: "non-answer" });
  assert.ok(repeated.total <= 5);
  assert.ok(partial.total > greeting.total && partial.total < 30);
  assert.ok(strong.total >= 85);
  assert.equal(coachScoreLabel(greeting.total), "No answer to score");
  assert.equal(coachScoreLabel(strong.total), "Exceptional answer");
});

test("analysis degrades LinkedIn reputation instead of inventing a score", () => {
  const result = analyseCandidate(job);
  assert.equal(result.reputationScore, null);
  assert.equal(result.provenance.mode, "deterministic-fallback");
  assert.ok(result.alignmentScore >= 50 && result.alignmentScore <= 100);
  assert.ok(result.requirements.length >= 3);
  assert.match(result.fitSummary, /not a hiring probability/i);
  assert.ok(result.preparationPlan.length >= 1);
  assert.equal(result.companyResearch.status, "not-available");
});

test("fallback analysis preserves safe target-role source links without inventing research", () => {
  const result = analyseCandidate({ ...job, company: "Test Co", roleLinks: ["https://example.com/jobs/123", "javascript:alert(1)"] });
  assert.equal(result.companyResearch.status, "links-only");
  assert.deepEqual(result.companyResearch.sources.map((source) => source.url), ["https://example.com/jobs/123"]);
  assert.match(result.companyResearch.overview, /OpenAI is connected/i);
});

test("question and quiz generators honour product counts", () => {
  const analysedJob = { ...job, analysis: analyseCandidate(job) };
  const questions = generateInterviewQuestions(analysedJob);
  assert.equal(questions.length, 112);
  assert.equal(new Set(questions.map((question) => question.id)).size, 112);
  assert.equal(generateQuiz(analysedJob, 5).length, 5);
  assert.equal(generateQuiz(analysedJob, 15).length, 15);
});

test("terminology study sheets cover every business department in plain English", () => {
  const sheet = generateStudySheet({ title: "Marketing Manager", description: "Lead AI-assisted creator campaigns and social content." });
  assert.equal(TERMINOLOGY_CATEGORIES.length, 9);
  assert.equal(sheet.terms.length, 45);
  for (const category of TERMINOLOGY_CATEGORIES) {
    const categoryTerms = sheet.terms.filter((term) => term.category === category);
    assert.ok(categoryTerms.length >= 5, `${category} should have at least five terms`);
    assert.ok(categoryTerms.every((term) => term.definition.length > 20 && term.inPractice.length > 20 && term.example.length > 15 && term.whyItMatters.length > 20));
  }
  const recommended = recommendedTerminologyCategories({ title: "Marketing Manager", description: "AI creator campaigns" });
  assert.ok(recommended.includes("Marketing & creator economy"));
  assert.ok(recommended.includes("AI & automation"));
});

test("terminology quizzes contain distinct terms and one valid answer", () => {
  const sheet = generateStudySheet({ title: "Operations Lead", description: "Improve cross-functional service delivery." });
  const quiz = generateTerminologyQuiz(sheet.terms, 15);
  assert.equal(quiz.length, 15);
  assert.equal(new Set(quiz.map((question) => question.focusTerm)).size, 15);
  assert.equal(new Set(quiz.map((question) => question.id)).size, 15);
  for (const question of quiz) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex <= 3);
    const term = sheet.terms.find((item) => item.term === question.focusTerm);
    assert.equal(question.options[question.correctIndex], term.definition);
  }
});

test("coaching identifies quantified, structured answers", () => {
  const question = generateInterviewQuestions({ ...job, analysis: analyseCandidate(job) })[0];
  const strong = coachAnswer("The situation was low adoption. My task was to find the cause. I interviewed 12 customers and led two experiments. The result was a 24% lift in weekly use.", question, job);
  const weak = coachAnswer("I am good at this and enjoy working with teams.", question, job);
  assert.ok(strong.score > weak.score);
  assert.equal(strong.breakdown.length, 4);
  assert.equal(strong.provenance.mode, "deterministic-fallback");
});

test("new jobs can persist user-authored interview questions and coach their answers", () => {
  const customQuestion = {
    id: "custom-q-1",
    number: 113,
    category: "Your question",
    prompt: "Tell me about a time you influenced a difficult stakeholder without formal authority.",
    focus: "the capability this question is testing",
  };
  const savedJob = { ...job, customInterviewQuestions: [customQuestion] };
  assert.equal(savedJob.customInterviewQuestions[0].prompt, customQuestion.prompt);
  const result = coachAnswer("I enjoy working with stakeholders.", customQuestion, { title: "Product Manager", company: "Test Co" });
  assert.ok(result.critique.length >= 1);
  assert.match(result.modelAnswer, /capability this question is testing/i);
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

test("document library keeps resumes and cover letters independent with optional kits", () => {
  const resumeItem = { id: "resume-1", name: "Product — AI", document: job.resume, updatedAt: new Date().toISOString() };
  const coverItem = { id: "cover-1", name: "AI platform opener", document: null, text: "I build responsible AI products.", updatedAt: new Date().toISOString() };
  const kit = { id: "kit-1", name: "AI roles", resumeLibraryId: resumeItem.id, coverLetterLibraryId: coverItem.id, resume: job.resume, coverLetterDocument: null, coverLetterText: coverItem.text, portfolioUrl: "", linkedinUrl: "", updatedAt: new Date().toISOString() };
  assert.equal(kit.resumeLibraryId, resumeItem.id);
  assert.equal(kit.coverLetterLibraryId, coverItem.id);
  assert.equal(documentDisplayName("Product_Manager-AI_v3.pdf"), "Product Manager AI v3");
});

test("legacy saved workspaces are upgraded into the document library", () => {
  const timestamp = new Date().toISOString();
  const legacyJob = { ...job, company: "Test Co", linkedinProfileText: "", linkedinDocuments: [], templateId: "kit-legacy", activeStage: 1, analysis: null, analysisHistory: [], interviewQuestions: [], interviewAnswers: {}, quizAttempts: [], createdAt: timestamp, updatedAt: timestamp };
  const legacy = { version: 1, activeJobId: legacyJob.id, jobs: [legacyJob], templates: [{ id: "kit-legacy", name: "Legacy profile", resume: job.resume, coverLetterDocument: null, coverLetterText: job.coverLetterText, portfolioUrl: "", linkedinUrl: "", updatedAt: timestamp }], evidenceItems: [] };
  const upgraded = normalizeDocumentLibrary(legacy);
  assert.equal(upgraded.resumeLibrary.length, 1);
  assert.equal(upgraded.coverLetterLibrary.length, 1);
  assert.ok(upgraded.jobs[0].resumeLibraryId);
  assert.ok(upgraded.jobs[0].coverLetterLibraryId);
  assert.deepEqual(upgraded.jobs[0].terminologyQuizAttempts, []);
});
