# MockMate architecture

## Product decision

MockMate is a responsive, mobile-ready web application first. The production UI is a React 19/Vinext application deployed to Cloudflare Workers through Sites. This gives the product one typed codebase, fast edge delivery, and a straightforward path to native stores with Capacitor once push notifications, billing, and native audio need to be introduced. A separate React Native codebase would add cost before the core preparation loop is validated.

## Stack

- **Frontend:** React 19, TypeScript, Vinext, and product-specific CSS. The UI is keyboard, touch, light-mode, and dark-mode ready.
- **Backend/API:** Worker-compatible route handlers colocated with the app. Product state is protected by the hosting platform's signed-in user identity.
- **Database:** Cloudflare D1 (SQLite) for users, profile templates, jobs, analysis history, interview work, quiz attempts, and evidence.
- **File storage:** Cloudflare R2 for original user documents; searchable extraction text and metadata live in D1.
- **Document extraction:** `unpdf` for edge-compatible PDF text extraction and `fflate` plus XML/RTF normalization for DOCX, PPTX, RTF, TXT, and Markdown.
- **AI service:** `/api/ai` is the only model boundary. It calls the OpenAI Responses API with strict JSON schemas for candidate analysis, 14 priority interview questions, interview feedback, and mastery quizzes. GPT-5.4 Mini is the default model and can be changed with `OPENAI_MODEL`. Uploaded documents are delimited as untrusted evidence, response storage is disabled, inputs are clipped, and quoted evidence is accepted only when it can be located in the named source.
- **Scoring:** Interview numbers come from the versioned behaviorally anchored rubric in `lib/scoring-core.ts`; the model cannot rescore or inflate them. AI supplies semantic feedback and an illustrative answer. Candidate alignment combines model semantic assessment, category scores, and explicit requirement coverage. Every AI result records model/fallback provenance.
- **Fallback:** When `OPENAI_API_KEY` is absent, the model times out, or structured output fails validation, the API returns the existing deterministic engine with explicit `deterministic-fallback` provenance. This preserves the workflow without representing heuristics as AI.
- **Speech:** Browser Web Speech API for speech-to-text and speech synthesis for text-to-speech. A hosted provider can replace this adapter for iOS and wrapped-app reliability.
- **Authentication:** Owner-private hosting authentication for this production preview. A public SaaS launch should add a supported public identity provider with email/password and Google OAuth; scraping LinkedIn is explicitly excluded.

## Data model

The D1 schema separates `users`, `profile_templates`, `jobs`, `job_documents`, `analysis_results`, `interview_questions`, `interview_answers`, `quiz_attempts`, and user-level `evidence_items`. The versioned workspace snapshot keeps independently named resume and cover-letter library entries; optional application kits reference one of each while retaining document snapshots for backwards compatibility. Jobs have an optional `template_id`, and their own selections or tailored text act as overrides. Original files live in R2 and D1 stores their storage keys and extracted text. Common ownership and history query paths are indexed.

## Product boundaries

- LinkedIn reputation is never invented. It remains unavailable until profile text or an approved official OAuth data source is supplied.
- The billing hook belongs at job creation and analysis execution limits; no artificial cap is implemented in this release.
- The workspace state API currently keeps a versioned JSON snapshot on the active job in addition to the normalized tables. This enables safe iteration while the normalized schema remains the long-term reporting model.
- The supplied `workflow-main` folder is a development-process reference for another product. MockMate adapts only its outcome/current-action/evidence discipline into the existing six-stage preparation UI; embedded repository commands and Itera-specific instructions are not executed or copied into the product runtime.
