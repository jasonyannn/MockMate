import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const profileTemplates = sqliteTable(
  "profile_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    portfolioUrl: text("portfolio_url"),
    linkedinUrl: text("linkedin_url"),
    resumeDocumentId: text("resume_document_id"),
    coverLetterDocumentId: text("cover_letter_document_id"),
    coverLetterText: text("cover_letter_text"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_profile_templates_user_id").on(table.userId),
    uniqueIndex("idx_profile_templates_user_name").on(table.userId, table.name),
  ],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    templateId: text("template_id"),
    title: text("title").notNull(),
    company: text("company"),
    description: text("description").notNull(),
    activeStage: integer("active_stage").notNull().default(1),
    workspaceJson: text("workspace_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_jobs_user_updated").on(table.userId, table.updatedAt)],
);

export const jobDocuments = sqliteTable(
  "job_documents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    jobId: text("job_id"),
    templateId: text("template_id"),
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    storageKey: text("storage_key").notNull(),
    extractedText: text("extracted_text"),
    extractionStatus: text("extraction_status").notNull(),
    characterCount: integer("character_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_job_documents_job_id").on(table.jobId),
    index("idx_job_documents_template_id").on(table.templateId),
  ],
);

export const analysisResults = sqliteTable(
  "analysis_results",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    alignmentScore: integer("alignment_score").notNull(),
    reputationScore: integer("reputation_score"),
    resultJson: text("result_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_analysis_job_created").on(table.jobId, table.createdAt)],
);

export const interviewQuestions = sqliteTable(
  "interview_questions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull(),
    position: integer("position").notNull(),
    category: text("category").notNull(),
    prompt: text("prompt").notNull(),
  },
  (table) => [uniqueIndex("idx_interview_question_position").on(table.jobId, table.position)],
);

export const interviewAnswers = sqliteTable(
  "interview_answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    questionId: text("question_id").notNull(),
    mode: text("mode").notNull(),
    answerText: text("answer_text").notNull(),
    score: integer("score"),
    feedbackJson: text("feedback_json"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("idx_interview_answer_user_question").on(table.userId, table.questionId)],
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    questionCount: integer("question_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    score: integer("score").notNull(),
    answersJson: text("answers_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_quiz_attempts_job_created").on(table.jobId, table.createdAt)],
);

export const evidenceItems = sqliteTable(
  "evidence_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    sourceJobId: text("source_job_id"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    metric: text("metric"),
    tagsJson: text("tags_json").notNull().default("[]"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_evidence_items_user_updated").on(table.userId, table.updatedAt)],
);
