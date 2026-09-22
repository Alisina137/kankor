# Project State

## Product objective
Mobile-first Kankor preparation platform for Afghan students with exam simulation, targeted practice, instant scoring, review, explanations, and progress intelligence.

## Source specification
KankorPrep Afghanistan — Complete Product and System Specification, September 2026.

## Agreed scope
Freemium student mobile app, web administration, structured monolith API, PostgreSQL data layer.

## Technology stack
- Expo SDK 57 / React Native 0.86 / TypeScript
- Next.js 16.3.3 / React 19.2.3
- Fastify 5.12.5 / Node.js 22+
- PostgreSQL / Drizzle ORM 0.45.3
- npm workspaces
- AsyncStorage 2.2.0 for resilient non-secret exam state

## Architecture decisions
- Monorepo with `apps/mobile`, `apps/admin`, `apps/api`, shared packages.
- RTL localization treats Dari and Pashto as first-class languages; English remains secondary.
- Authentication uses first-party email/password accounts for MVP.
- Passwords use Node scrypt hashing.
- Sessions use random opaque bearer tokens; only SHA-256 token hashes are stored server-side.
- Native mobile session tokens use Expo SecureStore.
- Curriculum is relational and traceable: Subject + Grade → Book → Chapter → Topic → Question.
- Questions preserve source metadata, language, difficulty, marks, explanations, worked solutions, verification state, and version.
- Student-facing active-exam APIs never expose answer keys.
- Content-admin APIs require an admin role or bootstrap email.
- Annual Kankor rules remain administrator-configurable and are not hard-coded.
- Generated exams snapshot question text, choices, correct answer, marks, explanations, worked solution, curriculum metadata, and scoring rules.
- Full-Kankor generation requires explicit valid scoring rules on the active blueprint.
- Targeted practice uses an explicit versioned internal marks-based scoring snapshot.
- Active attempts are owned by the authenticated student and use server timestamps for timer recovery.
- Client answers are local-first and synchronized with monotonically increasing revisions.
- PostgreSQL atomically rejects delayed older autosaves.
- Submission locks the attempt before authoritative server-side scoring.
- Attempt results and analyses are immutable one-per-attempt snapshots.
- Duplicate submissions reuse the same stored result.
- Database remains Neon-compatible PostgreSQL with deterministic SQL migrations.

## Current implementation phase
Phase 7 — Progress and Mistake System completed in source.

## Completed phase outcomes
### Phase 1
- Mobile shell, navigation, design tokens, RTL localization, admin/API/database foundations.

### Phase 2
- Registration, login/logout, recovery/reset, secure sessions, onboarding, account deletion, and protected entry.

### Phase 3
- Structured curriculum and question system.
- Question translations, content admin management, publication lifecycle, and student curriculum browsing.

### Phase 4
- Configurable exam blueprints and generation.
- Full and targeted exams.
- Immutable exam question snapshots.
- Reliable attempt start/resume, server timer, local-first persistence, atomic autosave revisions, navigator, flags, and idempotent submission.

### Phase 5
- Blueprint-level configurable scoring rules for full Kankor.
- Explicit scoring-rule snapshots stored with each generated exam and attempt configuration.
- Explanation/worked-solution snapshots stored with generated exam questions.
- AttemptResult and AttemptAnalysis persistence.
- Server-authoritative scoring using frozen question/answer/configuration data only.
- Correct, incorrect, unanswered, score, maximum score, percentage, and total-time calculations.
- Per-answer correctness and awarded-score persistence.
- Multidimensional analysis by subject, grade, book, chapter, topic, difficulty, and timing.
- Strongest/weakest topic summaries and deterministic next-action recommendation.
- Immediate scoring/analysis during idempotent submission.
- GET result, review, and completed-exam history APIs with student ownership enforcement.
- Review filters: all, incorrect, correct, unanswered, and flagged.
- Review data includes original frozen question, choices, student's answer, correct answer, correctness, explanations, worked solution, and curriculum metadata.
- Mobile result page with primary metrics, subject/topic analysis, strongest/weakest areas, and recommendation.
- Mobile review page with correctness labels, answer comparison, explanations, worked solutions, curriculum trace, and filters.
- Completed-exam history on the Exams tab.
- Admin UI for explicit full-Kankor scoring-rule configuration.
- Phase 5 structural verifier.

### Phase 6
- HistoricalForm and HistoricalFormQuestion archive entities.
- Year, cycle, province, round, form code, language, source reference, source confidence, original-order confidence, timing, scoring metadata, and verification lifecycle.
- Historical form questions preserve original order and per-question provenance/scoring metadata.
- Duplicate underlying questions are supported when a historical source genuinely repeats one.
- Published historical forms are fixed and cannot randomize or silently replace their ordered question list.
- Admin APIs/UI for form creation, metadata editing, bulk JSON import, ordered question assignment, review/approval/publication, and provenance.
- Publication blocks empty, non-contiguous, or unpublished-question forms.
- Student archive browsing/filtering by year, province, round, and language.
- Authentic historical form start snapshots exact ordered questions into the existing resilient exam engine.
- Historical attempts preserve form identity/provenance and scoring authority in configuration snapshots.
- Unknown historical scoring rules are never invented; explicit practice fallback is marked in provenance.
- Result page identifies historical form provenance and whether practice scoring fallback was used.
- Phase 6 structural verifier.

### Phase 7
- MistakeItem tracks user/question/topic, first miss, last attempt, miss count, mastered state, mastered time, and latest attempt.
- TopicMastery stores attempts, question totals, correct/incorrect/unanswered counts, accuracy, timing, and first/last activity.
- Mistakes/mastery are deterministically recalculated from authoritative analyzed attempts, making retries idempotent.
- Longitudinal topic mapping uses immutable exam curriculum snapshots rather than current mutable question mapping.
- Completed-attempt scoring automatically refreshes mistake and mastery state.
- Existing pre-Phase-7 completed attempts are backfilled when Progress is first opened.
- Progress APIs expose overview, subject trends, topic mastery, and performance history with student ownership.
- Mistake Notebook API/UI shows active/mastered mistakes and repeated misses.
- Targeted re-practice creates a real topic exam directly from mistakes, weak-topic analytics, result recommendations, and question review.
- Progress mobile tab replaces the placeholder with longitudinal metrics, weak topics, subject performance, and recent history.
- Phase 7 structural verifier.

## Verification status
- Phase 2 account flow was locally verified by the user.
- Phase 3 admin access was locally verified by the user.
- Phase 4 source was repaired after the user's TypeScript report; the attempt router was restored on main.
- Phase 5 critical scoring, result, review, and configuration files were reviewed after writes.
- `scripts/verify-phase5.mjs` validates scoring snapshots, server scoring, immutable result entities, multidimensional analysis, result/review endpoints, mobile results, explanations, and worked solutions.
- Full dependency install, database migration, TypeScript checks, builds, and runtime submit→result→review testing require local verification after pull.

## Known issues / external requirements
- Run `npm run db:migrate` after pulling Phase 5.
- Existing full-Kankor blueprints created before Phase 5 do not automatically receive invented scoring rules. Edit/recreate them with verified scoring multipliers before starting a new full Kankor exam.
- Existing pre-Phase-5 full-Kankor exams without a scoring snapshot cannot be authoritatively scored; start a new exam after configuring the blueprint.
- Targeted practice uses the documented internal marks-based scoring snapshot: correct = question marks, incorrect = 0, unanswered = 0.
- The product owner still needs to supply/verify authoritative curriculum, questions, and annual Kankor scoring policy.
- Historical archive infrastructure is complete, but no real historical Kankor papers have been imported yet because authoritative source forms have not been supplied.

## Latest source baseline
Phase 7 branch awaiting merge to `main`.

## Next phase
Phase 8 — Freemium and Billing.
