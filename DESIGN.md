# MockMate Design

## Experience model

MockMate is organised around one private preparation workspace containing multiple jobs. Each job can select independently saved resumes and cover letters, optionally pair them as an application kit, and retain its own analysis, questions, answers, quiz history, and progress.

## Workflow

1. **Role and documents** — enter the target role and job description, then select or upload supporting documents.
2. **Candidate analysis** — compare role requirements with supplied evidence and identify genuine gaps.
3. **Mock interview** — practise generated questions or add personal questions, answer by writing or speaking, and request coaching.
4. **Mastery quiz** — test role judgement and trade-offs with immediate explanations.
5. **Evidence bank** — save reusable proof points with context, actions, metrics, sources, and tags.
6. **Dashboard** — review readiness, recent activity, and the next useful preparation action.

## Information and state

- `Workspace` is the user-owned root record.
- `Job` holds role data, selected documents, analysis, generated questions, custom questions, answers, and attempts.
- Resume and cover-letter libraries are independent; application kits reference one of each as a convenience.
- Custom interview questions are stored separately from generated questions, then combined for navigation and coaching.
- Workspace state is saved after changes and restored on the next authenticated visit.

## Interview interaction

- Generated questions and user-authored questions share one question browser.
- A custom question is labelled **Your question** and can be removed by its owner.
- Every question supports written and spoken answers.
- Coaching uses the same relevance, STAR structure, specific-evidence, and concision rubric.
- The interface identifies whether AI generation or the verified deterministic fallback produced an output.

## Visual system

- Warm paper background, dark forest ink, off-white surfaces, acid-lime primary actions, and coral focus accents.
- Bitter is used for editorial headings; Atkinson Hyperlegible is used for interface text.
- Primary actions use strong foreground/background contrast, visible focus treatment, and a minimum practical touch target.
- Cards, borders, and spacing establish hierarchy without relying on colour alone.

## Responsive and accessible behaviour

- The desktop sidebar becomes an off-canvas navigation panel on smaller screens.
- Complex two-column work areas collapse to a single readable column.
- Every input has a programmatic label; status and coaching updates use live regions where useful.
- Keyboard focus is visible, a skip link is provided, and enhanced focus, contrast, text-size, reduced-motion, and reading-font preferences are supported.
- Speaking is optional; all core practice remains available through text.

## Design constraints

- The public landing page remains available without authentication; personal work requires sign-in.
- The hosted Sites URL may use a platform suffix until a custom domain is connected.
- Model-backed features must degrade safely and visibly when the provider is not configured or temporarily unavailable.
