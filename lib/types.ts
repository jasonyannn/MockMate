export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export type AIProvenance = {
  mode: "openai" | "deterministic-fallback";
  model: string | null;
  generatedAt: string;
  reason?: string;
};

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

export type ResearchSource = {
  title: string;
  url: string;
};

export type CompanyResearch = {
  overview: string;
  roleContext: string;
  signals: string[];
  sources: ResearchSource[];
  status: "researched" | "links-only" | "not-available";
};

export type PreparationAction = {
  title: string;
  action: string;
  reason: string;
};

export type AnalysisResult = {
  id: string;
  alignmentScore: number;
  reputationScore: number | null;
  categories: { label: string; score: number; note: string }[];
  evidenceFound: EvidenceMatch[];
  gaps: string[];
  requirements: Requirement[];
  fitSummary: string;
  companyResearch: CompanyResearch;
  preparationPlan: PreparationAction[];
  createdAt: string;
  rubricVersion: string;
  provenance?: AIProvenance;
};

export type CoachResult = {
  score: number;
  breakdown: { label: string; score: number }[];
  critique: string[];
  modelAnswer: string;
  rubricVersion: string;
  provenance?: AIProvenance;
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
  provenance?: AIProvenance;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category?: TerminologyCategory;
  focusTerm?: string;
  provenance?: AIProvenance;
};

export type QuizAttempt = {
  id: string;
  score: number;
  correct: number;
  total: number;
  createdAt: string;
};

export type TerminologyCategory =
  | "AI & automation"
  | "Agentic engineering"
  | "Technology & data"
  | "Marketing & creator economy"
  | "People & HR"
  | "Sales & customer success"
  | "Finance & commercial"
  | "Operations & strategy"
  | "Product & design"
  | "Legal, risk & governance";

export type StudyTerm = {
  id: string;
  category: TerminologyCategory;
  term: string;
  definition: string;
  inPractice: string;
  example: string;
  whyItMatters: string;
};

export type TerminologySheet = {
  terms: StudyTerm[];
  generatedAt: string;
  provenance: AIProvenance;
  sources?: ResearchSource[];
};

export type Job = {
  id: string;
  title: string;
  company: string;
  description: string;
  roleLinks: string[];
  resume: DocumentRecord | null;
  resumeLibraryId: string | null;
  coverLetterDocument: DocumentRecord | null;
  coverLetterText: string;
  coverLetterLibraryId: string | null;
  portfolioUrl: string;
  linkedinUrl: string;
  linkedinProfileText: string;
  linkedinDocuments: DocumentRecord[];
  templateId: string | null;
  activeStage: StageId;
  analysis: AnalysisResult | null;
  analysisHistory: { score: number; at: string }[];
  interviewQuestions?: InterviewQuestion[];
  customInterviewQuestions?: InterviewQuestion[];
  interviewAnswers: Record<string, InterviewAnswer>;
  quizAttempts: QuizAttempt[];
  terminologySheet?: TerminologySheet;
  terminologyQuizAttempts?: QuizAttempt[];
  createdAt: string;
  updatedAt: string;
};

export type ProfileTemplate = {
  id: string;
  name: string;
  resumeLibraryId: string | null;
  coverLetterLibraryId: string | null;
  resume: DocumentRecord | null;
  coverLetterDocument: DocumentRecord | null;
  coverLetterText: string;
  portfolioUrl: string;
  linkedinUrl: string;
  updatedAt: string;
};

export type SavedResume = {
  id: string;
  name: string;
  document: DocumentRecord;
  updatedAt: string;
};

export type SavedCoverLetter = {
  id: string;
  name: string;
  document: DocumentRecord | null;
  text: string;
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
  resumeLibrary: SavedResume[];
  coverLetterLibrary: SavedCoverLetter[];
  evidenceItems: EvidenceItem[];
};
