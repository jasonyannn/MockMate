CREATE TABLE `analysis_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`alignment_score` integer NOT NULL,
	`reputation_score` integer,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_job_created` ON `analysis_results` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_job_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`metric` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_items_user_updated` ON `evidence_items` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `interview_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`question_id` text NOT NULL,
	`mode` text NOT NULL,
	`answer_text` text NOT NULL,
	`score` integer,
	`feedback_json` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interview_answer_user_question` ON `interview_answers` (`user_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `interview_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`position` integer NOT NULL,
	`category` text NOT NULL,
	`prompt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_interview_question_position` ON `interview_questions` (`job_id`,`position`);--> statement-breakpoint
CREATE TABLE `job_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text,
	`template_id` text,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`extracted_text` text,
	`extraction_status` text NOT NULL,
	`character_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_job_documents_job_id` ON `job_documents` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_job_documents_template_id` ON `job_documents` (`template_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`title` text NOT NULL,
	`company` text,
	`description` text NOT NULL,
	`active_stage` integer DEFAULT 1 NOT NULL,
	`workspace_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_user_updated` ON `jobs` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `profile_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`portfolio_url` text,
	`linkedin_url` text,
	`resume_document_id` text,
	`cover_letter_document_id` text,
	`cover_letter_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_profile_templates_user_id` ON `profile_templates` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profile_templates_user_name` ON `profile_templates` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`question_count` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`score` integer NOT NULL,
	`answers_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quiz_attempts_job_created` ON `quiz_attempts` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
