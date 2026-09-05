# MockMate

MockMate turns a target job, resume and supporting profile into an evidence-backed preparation plan. The application includes independently named resume and cover-letter libraries, optional application kits that pair them, AI-assisted candidate-to-role analysis, role-specific and user-authored interview questions, behaviorally anchored interview scoring with AI coaching, a cross-department terminology study sheet and quiz lab, adaptive role-mastery quizzes, a user-level evidence bank, readiness trends, document extraction, responsive layouts and persisted light/dark themes.

The public landing page uses Sign in with ChatGPT for account creation and sign-in. This is separate from Gmail/Google OAuth: MockMate receives a stable Site-specific user ID and email from the hosting platform, stores the account in D1, and isolates every workspace and uploaded document by that user ID. Anonymous visitors can view the landing page but cannot read, save, upload, or use personalised coaching endpoints.

## Project documents

- [`GOAL.md`](GOAL.md) — product purpose, users, scope, and success measures.
- [`DESIGN.md`](DESIGN.md) — workflow, interaction model, visual system, and accessibility.
- [`SECURITY.md`](SECURITY.md) — authentication, data isolation, AI safety, and threat considerations.
- [`VERIFICATION.md`](VERIFICATION.md) — automated, functional, security, and release checks.

## Local development

```bash
npm install
npm run dev
```

The site uses logical `DB` (D1) and `DOCUMENTS` (R2) bindings declared in `.openai/hosting.json`. Local preview resources are managed by the Cloudflare development runtime.

### AI configuration

AI calls run only from `/api/ai`; the browser never receives the provider key. For local AI, copy `.dev.vars.example` to `.dev.vars`, add `OPENAI_API_KEY`, and restart the dev server. `OPENAI_MODEL` defaults to the current GPT-5.6 flagship alias.

Without a key or during a provider outage, MockMate stays usable and labels the result as a verified deterministic fallback. The fallback is never presented as model output. In Sites production, configure the same variables as runtime environment variables rather than committing a secret.

The Knowledge Lab always includes a curated plain-English glossary of more than 80 current terms spanning AI and automation, agentic engineering, technology and data, marketing and the creator economy, people and HR, sales, finance, operations, product, and governance. It covers practical concepts such as model context, MCP, tool calling, evals, Vite builds, configuration, Markdown, deployment, current frontier-model names and cross-functional business language. When AI is configured, a web-backed refresh checks current official sources and adds role-personalised terminology while retaining full category coverage. Terminology and role-mastery quiz scores are saved separately and combined in the readiness dashboard.

The mock interview includes a hard-question pack for executive influence, transformation planning and operating-model change. Question generation can consult an allowlist of official Australian public sources. Only datasets with explicit reusable licensing are treated as data; other government material is linked as reference guidance. Aggregate labour-market context is never presented as an individual hiring probability, and the source panel records licence, attribution and caveats. MockMate does not scrape job boards or candidate profiles for this feature and does not use public data to make employment decisions.

## Preparation workflow

The six product stages are framed as an outcome-driven workflow: one target outcome, one current action, and evidence-backed completion gates. This adapts the useful continuity and verification ideas in the supplied workflow reference; its Itera-specific agent instructions and repository paths are not part of MockMate.

## Quality checks

```bash
npm test
npx tsc --noEmit
npm run lint
```

See `ARCHITECTURE.md` for product decisions, service boundaries, persistence and the mobile packaging recommendation.
