import { keywordCoverage, scoreAnswerCore, stableHash, tokenize } from "./scoring-core.ts";
import { publicQuestionSources } from "./public-interview-data.ts";
import type { AnalysisResult, CoachResult, InterviewQuestion, Job, QuizQuestion, Requirement } from "./types.ts";

export const AI_SERVICE_CONFIG = {
  provider: "openai-responses-with-deterministic-fallback",
  model: "gpt-5.6",
  temperature: 0,
  analysisRubricVersion: "alignment-v2.0",
  coachingRubricVersion: "star-coach-v2.0",
  tolerancePoints: 2,
} as const;

const KNOWN_REQUIREMENTS = [
  ["Product strategy", /product strateg|vision|roadmap/i],
  ["AI / machine learning", /\bai\b|machine learning|llm|artificial intelligence/i],
  ["Customer discovery", /customer research|customer discovery|user research|voice of customer/i],
  ["Data-informed decisions", /data[- ]driven|analytics|metrics|experiment|a\/b/i],
  ["Cross-functional leadership", /cross[- ]functional|stakeholder|engineering.*design|leadership/i],
  ["Go-to-market", /go[- ]to[- ]market|gtm|launch|commercial/i],
  ["Technical fluency", /technical|api|platform|architecture|software/i],
  ["Executive communication", /executive|communication|present|storytelling/i],
] as const;

const SOFT_REQUIREMENTS = /communication|collaborat|leadership|influence|curious|adapt|stakeholder/i;

function id(prefix: string, value: string): string {
  return `${prefix}-${stableHash(value).toString(36)}`;
}

function excerptFor(term: string, source: string): string | null {
  const sentences = source.split(/(?<=[.!?])\s+|\n+/).map((line) => line.trim()).filter(Boolean);
  const tokens = tokenize(term);
  const best = sentences
    .map((sentence) => ({ sentence, score: tokens.filter((token) => sentence.toLowerCase().includes(token)).length }))
    .sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.sentence.slice(0, 220) : null;
}

export function detectRequirements(description: string, resumeText = ""): Requirement[] {
  const detected = KNOWN_REQUIREMENTS.filter(([, pattern]) => pattern.test(description)).map(([label]) => label);
  const lines = description
    .split(/\n|[.;]/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter((line) => line.length > 24 && line.length < 145)
    .slice(0, 8)
    .map((line) => line.replace(/^(you will|you have|we need|requirements?:?)\s*/i, ""));
  const labels = [...new Set([...detected, ...lines])].slice(0, 9);
  return labels.map((label) => ({
    id: id("req", label),
    label,
    type: SOFT_REQUIREMENTS.test(label) ? "soft" : "hard",
    covered: keywordCoverage(resumeText, label) >= 28 || Boolean(excerptFor(label, resumeText)),
  }));
}

export function analyseCandidate(job: Pick<Job, "description" | "resume" | "coverLetterText" | "portfolioUrl" | "linkedinProfileText" | "linkedinDocuments"> & Partial<Pick<Job, "title" | "company" | "roleLinks">>): AnalysisResult {
  const linkedinText = [job.linkedinProfileText, ...(job.linkedinDocuments ?? []).map((document) => document.extractedText)].filter(Boolean).join("\n");
  const candidateText = `${job.resume?.extractedText ?? ""}\n${job.coverLetterText}\n${linkedinText}`;
  const requirements = detectRequirements(job.description, candidateText);
  const baseCoverage = keywordCoverage(candidateText, job.description);
  const coveredRatio = requirements.length ? requirements.filter((item) => item.covered).length / requirements.length : 0;
  const technical = Math.min(96, Math.round(baseCoverage * 0.72 + coveredRatio * 42 + 18));
  const domain = Math.min(94, Math.round(baseCoverage * 0.58 + (/(product|customer|market|ai|software)/i.test(candidateText) ? 34 : 16)));
  const leadership = Math.min(96, 48 + (/(led|owned|managed|drove|influenced|stakeholder)/i.test(candidateText) ? 29 : 8));
  const communication = Math.min(94, 50 + (/(presented|communicat|workshop|executive|story)/i.test(candidateText) ? 25 : 8) + (job.coverLetterText.length > 120 ? 8 : 0));
  const alignmentScore = Math.round(technical * 0.34 + domain * 0.27 + leadership * 0.22 + communication * 0.17);
  const evidenceFound = requirements
    .map((requirement) => ({ requirement, evidence: excerptFor(requirement.label, candidateText) }))
    .filter((item): item is { requirement: Requirement; evidence: string } => Boolean(item.evidence))
    .slice(0, 5)
    .map(({ requirement, evidence }) => ({
      id: id("evidence", requirement.label),
      requirement: requirement.label,
      evidence,
      source: job.resume?.filename ?? "Candidate profile",
    }));
  const gaps = requirements.filter((item) => !item.covered).map((item) => item.label).slice(0, 5);
  const resolvedGaps = gaps.length ? gaps : ["Add one recent quantified outcome to strengthen differentiation"];
  const roleLinks = (job.roleLinks ?? []).filter((value) => /^https?:\/\//i.test(value)).slice(0, 5);
  const now = new Date().toISOString();
  return {
    id: id("analysis", `${candidateText}${job.description}${now.slice(0, 13)}`),
    alignmentScore,
    reputationScore: linkedinText.trim().length > 120 ? Math.min(93, 58 + Math.round(keywordCoverage(linkedinText, job.description) * 0.35)) : null,
    categories: [
      { label: "Technical skills", score: technical, note: "Role tools, platform fluency and delivery evidence" },
      { label: "Domain experience", score: domain, note: "Relevant customer, market and problem context" },
      { label: "Leadership", score: leadership, note: "Ownership, influence and cross-functional scope" },
      { label: "Communication", score: communication, note: "Clarity, stakeholder range and narrative" },
    ],
    evidenceFound,
    gaps: resolvedGaps,
    requirements,
    fitSummary: `${alignmentScore >= 80 ? "Strong" : alignmentScore >= 65 ? "Promising" : "Developing"} evidence alignment for ${job.title || "this role"}. This is a preparation estimate, not a hiring probability, because applicant competition and interview performance are not visible.`,
    companyResearch: {
      overview: job.company ? `Live company research for ${job.company} becomes available when OpenAI is connected.` : "Add the company name and a reliable link to enable company research.",
      roleContext: "The fallback assessment uses the supplied job description only and does not invent current company facts.",
      signals: requirements.slice(0, 3).map((item) => item.label),
      sources: roleLinks.map((url) => ({ title: "Source supplied with target role", url })),
      status: roleLinks.length ? "links-only" : "not-available",
    },
    preparationPlan: resolvedGaps.slice(0, 4).map((gap) => ({
      title: `Prepare evidence for ${gap}`,
      action: "Build a concise STAR example with your decision, personal contribution and a measurable or observable result.",
      reason: "The current candidate material does not yet provide strong, directly verifiable evidence for this role signal.",
    })),
    createdAt: now,
    rubricVersion: AI_SERVICE_CONFIG.analysisRubricVersion,
    provenance: { mode: "deterministic-fallback", model: null, generatedAt: now, reason: "Model service was not used" },
  };
}

const QUESTION_STEMS = [
  "Tell me about a time you demonstrated {focus} under pressure.",
  "How would you approach {focus} in your first 90 days here?",
  "Describe a decision involving {focus} that you would make differently today.",
  "What is the strongest evidence that you can deliver {focus}?",
  "How do you measure whether your work in {focus} is successful?",
  "Walk me through how you align stakeholders around {focus}.",
  "What trade-off is most often misunderstood when working on {focus}?",
  "How have you handled disagreement while leading {focus}?",
  "Give an example where customer insight changed your approach to {focus}.",
  "What would your engineering or design partners say about how you lead {focus}?",
  "Tell me about a failure related to {focus} and what changed afterward.",
  "How do you balance speed, quality and risk when delivering {focus}?",
  "What questions would you ask before committing to a plan for {focus}?",
  "How would you explain a complex decision about {focus} to an executive audience?",
] as const;

function hardInterviewQuestions(job: Pick<Job, "title" | "description">): InterviewQuestion[] {
  const isAIRole = /\bAI\b|artificial intelligence|machine learning|LLM|automat|transformation|innovation/i.test(`${job.title} ${job.description}`);
  return [
    {
      id: id("q-hard", `${job.title}-manager-trust`),
      number: 1,
      category: "Executive influence",
      prompt: isAIRole
        ? "How would you convince a manager on day one who doesn’t know AI that you’re a good fit?"
        : "How would you convince a manager on day one that you understand their team and are a good fit?",
      focus: "executive presence, business communication and trust-building",
      difficulty: "hard",
      whyAsked: "This tests whether you listen before prescribing, communicate in business outcomes and build trust with a non-technical stakeholder.",
      answerGuide: ["Discover the team’s goals and friction", "Translate capability into business outcomes", "Propose one small, measurable proof", "Earn trust before asking to scale"],
      sources: publicQuestionSources("industry-ai-guardrails", "oaic-ai-privacy"),
    },
    {
      id: id("q-hard", `${job.title}-first-90-days`),
      number: 2,
      category: isAIRole ? "AI transformation" : "Transformation",
      prompt: isAIRole ? "How would you run AI in the first 60–90 days?" : "How would you improve this team’s way of working in your first 60–90 days?",
      focus: "discovery, prioritisation, governance, pilots, ROI, adoption and scaling",
      difficulty: "hard",
      whyAsked: "This tests whether you can turn ambition into a sequenced operating plan with safeguards, ownership and evidence of value.",
      answerGuide: ["Days 1–30: discover and map friction", "Days 30–60: prioritise and pilot", "Days 60–90: measure, learn and improve", "Scale only when evidence and adoption support it"],
      sources: publicQuestionSources("industry-ai-guardrails", "jsa-nero"),
    },
    {
      id: id("q-hard", `${job.title}-change-operating-model`),
      number: 3,
      category: "Operating model",
      prompt: "How have you automated or changed a team’s way of working?",
      focus: "workflow redesign, stakeholder collaboration, access controls and measurable impact",
      difficulty: "hard",
      whyAsked: "This tests whether you have changed a real workflow or operating model, rather than only building a standalone tool.",
      answerGuide: ["Describe the old workflow and its friction", "Explain your personal decisions and collaboration", "Cover data access, risk or controls", "Show the before → after change and impact"],
      sources: publicQuestionSources("australian-skills-classification", "oaic-ai-privacy"),
    },
  ];
}

export function hasCurrentInterviewQuestionPack(questions: InterviewQuestion[] | undefined): boolean {
  return questions?.length === 112 && questions.slice(0, 3).every((question) => question.difficulty === "hard" && question.answerGuide?.length);
}

export function generateInterviewQuestions(job: Pick<Job, "title" | "description" | "analysis">): InterviewQuestion[] {
  const focuses = job.analysis?.requirements.map((item) => item.label) ?? detectRequirements(job.description).map((item) => item.label);
  const safeFocuses = focuses.length ? focuses : ["role priorities", "customer outcomes", "cross-functional delivery", "measurable impact"];
  const hardQuestions = hardInterviewQuestions(job);
  const roleQuestions = Array.from({ length: 112 - hardQuestions.length }, (_, roleIndex) => {
    const index = roleIndex + hardQuestions.length;
    const focus = safeFocuses[index % safeFocuses.length];
    const stem = QUESTION_STEMS[Math.floor(index / safeFocuses.length) % QUESTION_STEMS.length];
    const cycle = Math.floor(index / (QUESTION_STEMS.length * safeFocuses.length));
    const suffix = cycle > 0 ? ` Use an example from the last ${cycle + 1} roles or projects.` : "";
    return {
      id: id("q", `${job.title}-${index}-${focus}`),
      number: index + 1,
      category: index % 4 === 0 ? "Role craft" : index % 4 === 1 ? "Behavioural" : index % 4 === 2 ? "Leadership" : "Evidence gap",
      prompt: `${stem.replace("{focus}", focus.toLowerCase())}${suffix}`,
      focus,
      difficulty: "core" as const,
    };
  });
  return [...hardQuestions, ...roleQuestions];
}

export function coachAnswer(answer: string, question: InterviewQuestion, job: Pick<Job, "title" | "company">): CoachResult {
  const core = scoreAnswerCore(answer, `${question.prompt} ${question.focus}`);
  const focusLabel = question.category === "Your question" ? "the capability this question is testing" : question.focus.toLowerCase();
  const critique: string[] = [];
  if (core.classification === "non-answer") {
    critique.push("This does not answer the interview question yet, so no rubric credit was awarded.");
    critique.push(`Start with one real situation involving ${focusLabel} and explain why it mattered.`);
    critique.push("Then describe your personal actions and finish with a measurable or observable result.");
  } else {
    if (core.relevance < 65) critique.push(`Anchor the opening directly to ${focusLabel} and keep every detail tied to that competency.`);
    if (core.structure < 70) critique.push("Make the STAR arc explicit: the situation, your responsibility, the actions only you took, then the result.");
    if (core.evidence < 70) critique.push("Add a specific decision, scope and measurable or observable outcome; avoid asking the interviewer to infer impact.");
    if (core.wordCount < 60) critique.push("Develop this beyond a short summary. A complete interview answer usually needs enough detail to establish context, action and impact.");
    else if (core.concision < 70) critique.push("Tighten the answer toward a focused 60–120 seconds and remove detail that does not change the evidence.");
  }
  if (!critique.length) critique.push("The answer is strong. Sharpen it further by naming the hardest trade-off and what you learned.");
  const company = job.company || "the company";
  return {
    score: core.total,
    breakdown: [
      { label: "Relevance", score: core.relevance },
      { label: "STAR structure", score: core.structure },
      { label: "Specific evidence", score: core.evidence },
      { label: "Concision", score: core.concision },
    ],
    critique,
    modelAnswer: `At my previous company, we had a clear challenge around ${focusLabel}: the team was moving quickly, but customer evidence and delivery priorities were not aligned. I was accountable for creating a decision everyone could act on. I brought product, design and engineering together around the highest-risk assumptions, spoke with 12 customers, and turned the findings into a sequenced plan with one measurable outcome per release. I also set a weekly decision review so trade-offs stayed visible. Within one quarter, adoption increased by 24% and delivery predictability improved by 18%. The lesson I would bring to the ${job.title} role at ${company} is to make evidence, ownership and success measures explicit before accelerating execution.`,
    rubricVersion: AI_SERVICE_CONFIG.coachingRubricVersion,
    provenance: { mode: "deterministic-fallback", model: null, generatedAt: new Date().toISOString(), reason: "Model service was not used" },
  };
}

export function generateQuiz(job: Pick<Job, "title" | "description" | "analysis">, count: 5 | 10 | 15): QuizQuestion[] {
  const focuses = job.analysis?.requirements.map((item) => item.label) ?? detectRequirements(job.description).map((item) => item.label);
  const safeFocuses = focuses.length ? focuses : ["customer outcomes", "roadmap prioritisation", "stakeholder alignment"];
  return Array.from({ length: count }, (_, index) => {
    const focus = safeFocuses[index % safeFocuses.length];
    const correctIndex = stableHash(`${job.title}-${focus}-${index}`) % 4;
    const correct = `Define the desired outcome, gather relevant evidence, then test the highest-risk assumption`;
    const distractors = [
      `Start with a detailed delivery plan before validating the problem`,
      `Use the loudest stakeholder request as the primary decision rule`,
      `Wait for complete certainty before making any decision`,
    ];
    const options = [...distractors];
    options.splice(correctIndex, 0, correct);
    return {
      id: id("quiz", `${job.title}-${index}-${focus}`),
      prompt: `For a ${job.title}, which approach best demonstrates sound judgement when working on ${focus.toLowerCase()}?`,
      options,
      correctIndex,
      explanation: `Strong practice starts with an explicit outcome and evidence, then reduces the largest uncertainty. It avoids treating activity, hierarchy or perfect information as a substitute for judgement.`,
    };
  });
}
