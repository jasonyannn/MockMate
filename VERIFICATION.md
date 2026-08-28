# MockMate Verification

## Required automated checks

Run these from the project root before publishing:

```bash
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

`npm test` covers deterministic scoring, question and quiz generation, document extraction, LinkedIn privacy filtering, preference parsing, document-library upgrades, custom-question coaching, a production build, and rendered HTML checks.

## Functional verification

### Accounts and persistence

- Anonymous visitors can view the landing page but cannot read or save a workspace.
- A signed-in first-time user receives a blank private workspace.
- Changes persist after refresh and do not appear for another account.
- Sign-out returns the user to the public experience.

### Role and documents

- A user can create multiple jobs and switch between them.
- Resumes and cover letters can be named, reused independently, paired optionally, and removed safely.
- Supported documents upload and extract readable text; invalid or oversized files show a useful error.

### Analysis and practice

- Analysis requires a role title, job description, and readable resume.
- Requirements, evidence, and gaps refer only to supplied material.
- The AI/fallback provenance badge matches the service actually used.
- Generated questions remain attached to the correct job.
- A user can add a custom question, find it in the question list, answer by writing or speaking, request coaching, refresh, and see it again.
- Removing a custom question also removes its saved answer without affecting other questions.

### Accessibility and responsive behaviour

- The landing-page **Create account** button has readable text and arrow contrast in light and dark themes.
- All interactive elements have visible keyboard focus and logical tab order.
- Skip links, form labels, status announcements, and dialog focus behaviour work with a screen reader.
- Text-size, high-contrast, reduced-motion, enhanced-focus, and reading-font settings remain usable.
- Desktop, tablet, and mobile layouts avoid clipped controls and horizontal scrolling.

## Security verification

- Workspace, upload, delete, and AI POST endpoints reject anonymous requests.
- Workspace and document queries filter by authenticated user ID.
- Cross-user job identifiers and document operations are rejected.
- Provider keys do not appear in browser assets, responses, logs, or committed files.
- Untrusted document text cannot change system instructions or output schemas.

## Release verification

1. Complete the automated checks against the exact source revision to publish.
2. Confirm the production build contains the expected server entry point and hosting metadata.
3. Publish only that validated revision.
4. Wait for a successful production deployment.
5. Open the production URL and confirm the primary landing action and sign-in route load.

## Current baseline

The baseline as of 28 August 2026 includes public access at `https://mockmate.lxnaexpress.chatgpt.site/`, Sign in with ChatGPT, isolated persistent workspaces, reusable document libraries, custom interview questions, coaching, and labelled deterministic fallback behaviour when AI is not configured.
