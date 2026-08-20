export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export type DocumentRecord = {
  id: string;
  filename: string;
  contentType: string;
  storageKey: string;
  extractedText: string;
  characterCount: number;
  status: "extracted" | "stored" | "error";
};

export type Requirement = {
  id: string;
  label: string;
  type: "hard" | "soft";
  covered: boolean;
};

export type EvidenceMatch = {
  id: string;
  requirement: string;
  evidence: string;
  source: string;
};

export type AnalysisResult = {
  id: string;
  alignmentScore: number;
  reputationScore: number | null;
  categories: { label: string; score: number; note: string }[];
  evidenceFound: EvidenceMatch[];
  gaps: string[];
  requirements: Requirement[];
  createdAt: string;
  rubricVersion: string;
};

export type CoachResult = {
  score: number;
  breakdown: { label: string; score: number }[];
  critique: string[];
  modelAnswer: string;
  rubricVersion: string;
};

export type InterviewAnswer = {
  text: string;
  mode: "writing" | "speaking";
  result?: CoachResult;
  updatedAt: string;
};

export type InterviewQuestion = {
  id: string;
  number: number;
  category: string;
  prompt: string;
  focus: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizAttempt = {
  id: string;
  score: number;
  correct: number;
  total: number;
  createdAt: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  resume: DocumentRecord | null;
  coverLetterDocument: DocumentRecord | null;
  coverLetterText: string;
  portfolioUrl: string;
  linkedinUrl: string;
  linkedinProfileText: string;
  linkedinDocuments: DocumentRecord[];
  templateId: string | null;
  activeStage: StageId;
  analysis: AnalysisResult | null;
  analysisHistory: { score: number; at: string }[];
  interviewAnswers: Record<string, InterviewAnswer>;
  quizAttempts: QuizAttempt[];
  createdAt: string;
  updatedAt: string;
};

export type ProfileTemplate = {
  id: string;
  name: string;
  resume: DocumentRecord | null;
  coverLetterDocument: DocumentRecord | null;
  coverLetterText: string;
  portfolioUrl: string;
  linkedinUrl: string;
  updatedAt: string;
};

export type EvidenceItem = {
  id: string;
  title: string;
  description: string;
  metric: string;
  sourceJobId: string | null;
  source: string;
  tags: string[];
  createdAt: string;
};

export type Workspace = {
  version: 1;
  activeJobId: string;
  jobs: Job[];
  templates: ProfileTemplate[];
  evidenceItems: EvidenceItem[];
};
