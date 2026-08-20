# MockMate

MockMate turns a target job, resume and supporting profile into an evidence-backed preparation plan. The application includes reusable profile templates, candidate-to-role analysis, 112 role-specific interview questions with deterministic coaching, mastery quizzes, a user-level evidence bank, readiness trends, document extraction, responsive layouts and persisted light/dark themes.

## Local development

```bash
npm install
npm run dev
```

The site uses logical `DB` (D1) and `DOCUMENTS` (R2) bindings declared in `.openai/hosting.json`. Local preview resources are managed by the Cloudflare development runtime.

## Quality checks

```bash
npm test
npx tsc --noEmit
```

See `ARCHITECTURE.md` for product decisions, service boundaries, persistence and the mobile packaging recommendation.
