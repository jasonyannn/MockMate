const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "our", "are", "will", "have", "has", "into", "using", "role", "team", "work", "who", "their", "they", "but", "not", "all", "can", "across", "years", "experience",
  "tell", "about", "time", "demonstrate", "describe", "example", "would", "approach", "under", "pressure", "first", "here", "when", "what", "which", "most", "give", "walk", "through",
]);

const CONCEPT_GROUPS = [
  ["strategy", "strategic", "roadmap", "vision", "priorit", "trade-off", "tradeoff", "objective", "portfolio"],
  ["customer", "user", "discovery", "research", "interview", "insight", "feedback", "persona"],
  ["leadership", "lead", "led", "influenc", "align", "stakeholder", "ownership", "accountable"],
  ["data", "metric", "analytics", "experiment", "evidence", "measure", "kpi", "insight"],
  ["technical", "engineering", "architecture", "api", "platform", "software", "system"],
  ["communication", "communicat", "present", "narrative", "story", "executive", "workshop"],
  ["launch", "go-to-market", "gtm", "commercial", "sales", "adoption", "market"],
  ["ai", "machine learning", "artificial intelligence", "model", "llm", "automation"],
] as const;

function normalizeToken(token: string): string {
  if (token.endsWith("ies") && token.length > 5) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 4) return token.slice(0, -1);
  return token;
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => normalizeToken(token.replace(/^-+|-+$/g, "")))
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function keywordCoverage(source: string, target: string): number {
  const targetTokens = [...new Set(tokenize(target))];
  if (!targetTokens.length) return 0;
  const sourceTokens = new Set(tokenize(source));
  const matched = targetTokens.filter((token) => sourceTokens.has(token)).length;
  return Math.round((matched / targetTokens.length) * 100);
}

export function containsMetric(value: string): boolean {
  return /(?:\b\d+(?:\.\d+)?%?|\$\s?\d+|\b\d+x\b)/i.test(value);
}

function matchesConcept(value: string, concept: string): boolean {
  const normalized = value.toLowerCase();
  return concept.includes(" ") || concept.includes("-")
    ? normalized.includes(concept)
    : new RegExp(`\\b${concept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(normalized);
}

function conceptCoverage(answer: string, question: string): number {
  const requested = CONCEPT_GROUPS.filter((group) => group.some((concept) => matchesConcept(question, concept)));
  if (!requested.length) return 0;
  const matched = requested.filter((group) => group.some((concept) => matchesConcept(answer, concept))).length;
  return Math.round((matched / requested.length) * 100);
}

function hasPersonalAction(value: string): boolean {
  return /\bI\s+(?:(?:also|personally|then|first|next)\s+)?(?:led|owned|created|built|designed|decided|changed|launched|delivered|analysed|analyzed|interviewed|tested|prioriti[sz]ed|aligned|negotiated|facilitated|introduced|implemented|reframed|recommended|presented|partnered|established|measured|reduced|increased|drove|managed|coordinated|spoke|set|brought|conducted|gathered|defined|turned)\b/i.test(value);
}

function hasOutcome(value: string): boolean {
  return /\b(?:result|outcome|impact|increas|improv|reduc|grew|growth|saved|delivered|launched|adoption|revenue|retention|conversion|satisfaction|quality|faster|slower|within|after)\w*/i.test(value);
}

function hasRepeatedBlock(words: string[]): boolean {
  if (words.length < 6) return false;
  for (let size = 3; size <= Math.floor(words.length / 2); size += 1) {
    const tail = words.slice(-size).join(" ");
    const previous = words.slice(-size * 2, -size).join(" ");
    if (tail === previous) return true;
  }
  return false;
}

function detailCap(wordCount: number): number {
  if (wordCount === 0) return 0;
  if (wordCount < 8) return 2;
  if (wordCount < 15) return 8;
  if (wordCount < 25) return 18;
  if (wordCount < 40) return 35;
  if (wordCount < 60) return 55;
  if (wordCount < 80) return 75;
  return 100;
}

function isNonAnswer(answer: string, words: string[]): boolean {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return true;
  if (/^(?:hi|hello|hey)\b.*\b(?:my name is|i am|i'm)\b/i.test(normalized) && words.length < 25) return true;
  if (/^(?:i (?:do not|don't) know|not sure|no idea|skip|pass|n\/?a|nothing to add)\b/i.test(normalized) && words.length < 25) return true;
  return tokenize(answer).length < 2;
}

export function scoreAnswerCore(answer: string, question: string): {
  relevance: number;
  structure: number;
  evidence: number;
  concision: number;
  total: number;
  wordCount: number;
  classification: "non-answer" | "insufficient" | "partial" | "substantive";
} {
  const rawWords = answer.toLowerCase().match(/[a-z0-9+#%$'-]+/g) ?? [];
  const wordCount = rawWords.length;
  if (isNonAnswer(answer, rawWords)) return { relevance: 0, structure: 0, evidence: 0, concision: 0, total: 0, wordCount, classification: "non-answer" };

  const lexicalCoverage = keywordCoverage(answer, question);
  const semanticCoverage = conceptCoverage(answer, question);
  const topicMatched = lexicalCoverage > 0 || semanticCoverage > 0;
  const personalAction = hasPersonalAction(answer);
  const outcome = hasOutcome(answer);
  let relevance = Math.min(100, lexicalCoverage * 0.25 + semanticCoverage * 0.65 + (topicMatched && personalAction ? 10 : 0));
  if (!CONCEPT_GROUPS.some((group) => group.some((concept) => matchesConcept(question, concept)))) {
    relevance = Math.min(100, lexicalCoverage * 0.85 + (lexicalCoverage > 0 && personalAction ? 15 : 0));
  }

  const behavioralQuestion = /tell me about a time|describe|give (?:me )?an example|demonstrated/i.test(question);
  const situationalQuestion = /how would|what would|first \d+ days|approach/i.test(question);
  const contextSignal = /\b(?:situation|context|challenge|problem|when|during|at the time|faced|we had|the team had)\b/i.test(answer);
  const responsibilitySignal = /\b(?:task|goal|objective|responsib|accountable|my role|needed to|had to|I was asked)\w*/i.test(answer);
  const sequenceSignal = /\b(?:first|then|next|after|before|finally|ultimately)\b/i.test(answer);
  const resultSignal = /\b(?:result|outcome|impact|as a result|which led|therefore)\b/i.test(answer) || outcome;
  let structure: number;
  if (behavioralQuestion) {
    structure = (contextSignal ? 20 : 0) + (responsibilitySignal ? 20 : 0) + (personalAction ? 35 : 0) + (resultSignal ? 25 : 0);
  } else if (situationalQuestion) {
    const premise = /\b(?:assume|clarif|understand|diagnos|context|objective|first)\w*/i.test(answer);
    const approach = personalAction || /\b(?:I would|I'd|my approach|I plan|I start)\b/i.test(answer);
    const tradeoff = /\b(?:trade-off|tradeoff|risk|constraint|option|prioriti[sz]|decision)\w*/i.test(answer);
    const success = /\b(?:measure|metric|success|result|outcome|kpi|validate)\w*/i.test(answer);
    structure = (premise ? 25 : 0) + (approach ? 40 : 0) + (tradeoff ? 20 : 0) + (success ? 15 : 0);
  } else {
    structure = (contextSignal ? 20 : 0) + (personalAction ? 40 : 0) + (sequenceSignal ? 15 : 0) + (resultSignal ? 25 : 0);
  }

  const metric = containsMetric(answer);
  const scope = /\b(?:customer|user|stakeholder|executive|engineer|designer|team|department|market|region|country|enterprise|people|colleague|partner)\w*/i.test(answer);
  const decision = /\b(?:decid|chose|trade-off|tradeoff|prioriti[sz]|recommend|changed|reframed|hypothesis|experiment)\w*/i.test(answer);
  let evidence = (personalAction ? 30 : 0) + (metric ? 35 : 0) + (resultSignal ? 20 : 0) + (scope || decision ? 15 : 0);

  const lengthScore = wordCount < 15 ? 0 : wordCount < 30 ? 20 : wordCount < 50 ? 45 : wordCount < 70 ? 70 : wordCount <= 220 ? 100 : wordCount <= 300 ? 75 : wordCount <= 400 ? 45 : 20;
  const repetition = hasRepeatedBlock(rawWords);
  const contentWords = tokenize(answer);
  const uniqueRatio = contentWords.length ? new Set(contentWords).size / contentWords.length : 0;
  const repetitionMultiplier = repetition ? 0.25 : uniqueRatio < 0.45 ? 0.45 : uniqueRatio < 0.6 ? 0.72 : 1;
  const completeness = Math.min(1, (relevance + structure + evidence) / 190);
  let concision = lengthScore * completeness * repetitionMultiplier;

  const cap = detailCap(wordCount);
  if (repetition) {
    relevance *= 0.45;
    structure *= 0.35;
    evidence *= 0.35;
  }
  relevance = Math.round(Math.min(relevance, cap));
  structure = Math.round(Math.min(structure, cap));
  evidence = Math.round(Math.min(evidence, cap));
  concision = Math.round(Math.min(concision, cap));
  const uncappedTotal = Math.round(relevance * 0.3 + structure * 0.3 + evidence * 0.3 + concision * 0.1);
  const total = Math.min(uncappedTotal, repetition ? 5 : cap);
  const classification = wordCount < 25 || total < 20 ? "insufficient" : wordCount < 80 || total < 65 ? "partial" : "substantive";
  return { relevance, structure, evidence, concision, total, wordCount, classification };
}

export function coachScoreLabel(score: number): string {
  if (score >= 90) return "Exceptional answer";
  if (score >= 80) return "Interview ready";
  if (score >= 65) return "Strong foundation";
  if (score >= 45) return "Developing answer";
  if (score >= 20) return "Incomplete answer";
  if (score > 0) return "Minimal evidence";
  return "No answer to score";
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
