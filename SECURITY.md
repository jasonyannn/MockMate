# MockMate Security

## Security goals

- Keep every account's workspace and uploaded documents isolated.
- Prevent anonymous access to personal, upload, and coaching operations.
- Treat resumes, cover letters, job descriptions, LinkedIn exports, and user questions as untrusted data.
- Keep provider credentials and storage implementation details out of the browser.

## Authentication

MockMate uses the hosting platform's Sign in with ChatGPT flow. The application does not implement its own password database and does not require Gmail or Google OAuth. Trusted identity headers provide a stable Site-specific user ID and email after authentication.

Anonymous visitors may view the marketing page and the non-sensitive AI-status endpoint. Workspace reads and writes, uploads, deletions, and AI coaching requests require an authenticated identity.

## Authorisation and isolation

- Database reads and writes are filtered by the authenticated user ID.
- Job ownership is checked before updates or document attachment.
- Object-storage keys are scoped by user ID, and deletion also verifies ownership.
- A conflicting job identifier already owned by another user is rejected.
- The application has no anonymous fallback identity.

## Data handling

- D1 stores account metadata and the saved workspace payload.
- R2 stores uploaded originals; extracted text is retained only for user-requested analysis and practice.
- Custom interview questions and answers are part of the user's private workspace.
- LinkedIn import accepts only files or text supplied by the user and intentionally ignores private messages, contacts, connections, and search history.
- Inputs are size-limited, content types are checked, and unsupported documents fail safely.

## AI safety and privacy

- AI requests are made only from the server; provider keys are never sent to the browser.
- Job descriptions and candidate documents are treated as source material, not executable instructions.
- Prompts prohibit invented candidate facts, qualifications, outcomes, or company claims.
- Company research is isolated in a separate web-search request that receives role and employer context but no resume, cover-letter, LinkedIn, or portfolio evidence.
- User-supplied role/company links are restricted to HTTP(S), clipped, and treated as untrusted source material.
- Evidence quotes must be verifiable against user-supplied source text.
- Provider requests disable response storage and use a pseudonymous safety identifier derived from the Site-specific user ID.
- If AI is unavailable, the interface labels and uses a deterministic fallback instead of claiming model output.

## Secrets and configuration

- Secrets belong in local development variables or Sites runtime secrets, never committed source files.
- `.openai/hosting.json` contains only the project identifier and logical D1/R2 binding names.
- Source-repository credentials used for deployment are short-lived and are not persisted in Git configuration.

## Threats considered

- Horizontal access to another user's workspace or upload.
- Forged identifiers, ownership collisions, and unsafe object deletion.
- Prompt injection embedded in job descriptions or uploaded documents.
- Oversized or unsupported uploads.
- Accidental exposure of provider keys or raw platform credentials.
- Misleading AI output presented without provenance.

## Operational review

Before each public release, verify authentication gates, ownership filters, upload limits, secret handling, fallback labelling, dependency changes, and the checks in `VERIFICATION.md`.

Report suspected vulnerabilities privately to the project owner. Do not include real resumes, account identifiers, tokens, or other personal data in a public issue.
