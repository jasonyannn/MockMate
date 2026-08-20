const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "our", "are", "will", "have", "has", "into", "using", "role", "team", "work", "who", "their", "they", "but", "not", "all", "can", "across", "years", "experience",
]);

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
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

export function scoreAnswerCore(answer: string, question: string): {
  relevance: number;
  structure: number;
  evidence: number;
  concision: number;
  total: number;
} {
  const rawWords = answer.trim().split(/\s+/).filter(Boolean);
  const relevance = Math.min(100, 30 + keywordCoverage(answer, question) * 0.7);
  const structureSignals = [/(situation|context)/i, /(task|goal|responsib)/i, /(action|approach|first|then)/i, /(result|outcome|impact)/i];
  const structure = Math.min(100, 20 + structureSignals.filter((signal) => signal.test(answer)).length * 20 + (answer.split(/[.!?]+/).length > 4 ? 10 : 0));
  const evidence = Math.min(100, 25 + (containsMetric(answer) ? 45 : 0) + (/(because|measured|customer|stakeholder|data|research)/i.test(answer) ? 20 : 0));
  const length = rawWords.length;
  const concision = length < 20 ? 35 : length <= 180 ? 92 : length <= 260 ? 72 : 48;
  const total = Math.round(relevance * 0.3 + structure * 0.3 + evidence * 0.25 + concision * 0.15);
  return { relevance: Math.round(relevance), structure: Math.round(structure), evidence: Math.round(evidence), concision, total };
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
