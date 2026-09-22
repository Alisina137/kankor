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
- Student-facing question and exam-session APIs never expose answer keys.
- Content-admin APIs require an admin role or bootstrap email.
- Annual Kankor rules remain administrator-configurable and are not hard-coded.
- Generated exams snapshot question content, choices, version, marks, correct answer, and curriculum metadata server-side.
- Active attempts are owned by the authenticated student and use server timestamps for timer recovery.
- Client answers are saved locally first and synchronized with monotonically increasing revisions.
- PostgreSQL atomically rejects delayed older revisions from overwriting newer answers.
- Submission uses a deterministic idempotency key and completed attempts are locked.
- Database remains Neon-compatible PostgreSQL with Drizzle ORM and deterministic SQL migrations.

## Current implementation phase
Phase 4 — Examination Engine completed in source.

## Completed phase outcomes
### Phase 1
- Mobile application shell with five-tab navigation.
- Shared design tokens.
- Dari/Pashto/English localization architecture and RTL/LTR direction support.
- Next.js admin shell.
- Fastify API foundation.
- PostgreSQL/Drizzle database foundation.

### Phase 2
- Welcome, registration, login, logout, session restore, and session rotation.
- Password recovery token creation and password reset endpoints.
- Account deletion.
- Server-side auth validation and rate limiting.
- User/session/password-reset database schema and migration.
- Language, target Kankor year, and optional preparation-level onboarding.
- Auth/onboarding route guards.
- Personalized Home and Profile account controls.
- Secure native session persistence with Expo SecureStore.
- Local user verification confirmed account creation and normal connectivity.

### Phase 3
- Grade, Subject, Book, Chapter, Topic, Question, and QuestionTranslation database entities.
- Grade 10–12 structural records without inventing official subject/question content.
- Public curriculum APIs and protected content-admin management.
- Published-question APIs that omit correct answers.
- Full question trace through subject, grade, book, chapter, and topic.
- Web admin console and mobile Practice curriculum browser.
- Admin bootstrap access and question lifecycle controls.

### Phase 4
- Configurable ExamBlueprint, Exam, ExamQuestion, ExamAttempt, and AttemptAnswer entities.
- Configurable full-Kankor blueprint with effective year, question count, optional duration, criteria, and distribution segments.
- No hard-coded annual duration, scoring, or subject distribution.
- Full Kankor generation and targeted subject/book/chapter/topic/custom generation from published active curriculum content.
- Immutable per-exam question snapshots so later question edits cannot mutate an existing exam.
- Attempt ownership enforcement.
- Start/resume API with server-owned timer timestamps and remaining-time recovery.
- Batch answer autosave with selected choice, flag, per-question time, and client revision.
- Atomic PostgreSQL revision guard against delayed older autosaves.
- Idempotent submission and attempt locking.
- Answered/unanswered/flagged submit summary.
- Expo local-first attempt persistence with active-attempt index for relaunch/offline resume.
- Dedicated distraction-minimized exam route outside normal bottom navigation.
- Mobile timer, answer choices, flagging, navigator, previous/next navigation, submit confirmation, and automatic expiry submission attempt.
- Exams tab with active-attempt resume and full-Kankor entry.
- Practice tab with targeted exam setup, configurable question count, and optional timer.
- Admin blueprint management page.
- Admin question lifecycle controls through Draft → Review → Approved → Published → Deprecated.
- Phase 4 structural verifier.

## Verification status
- Phase 2 was locally verified by the user.
- Phase 3 admin login and content-admin access were locally verified by the user.
- Phase 4 critical files were reviewed after GitHub writes.
- `scripts/verify-phase4.mjs` checks database entities/migration, 160-question capacity, published/active question eligibility, snapshots, ownership-sensitive attempt routes, atomic revision protection, idempotent submission, timer recovery, local persistence, and mobile exam controls.
- Full dependency install, database migration, TypeScript checks, production builds, and runtime 160-question disruption testing require local verification after pull.

## Known issues / external requirements
- Run `npm run db:migrate` after pulling Phase 4.
- Full Kankor requires an active exam blueprint created in the admin panel.
- Exams require enough questions in `Published` state for the selected language/criteria.
- The product owner still needs to supply/verify the authoritative curriculum and question content.
- Exact annual Kankor duration, scoring weights, and subject distribution remain configuration data, not code constants.
- Phase 4 intentionally stops at reliable submission. Scoring, results, answer review, explanations, and worked-solution presentation begin in Phase 5.
- Historical fixed forms begin in Phase 6.

## Latest source baseline
Phase 4 branch awaiting merge to `main`.

## Next phase
Phase 5 — Scoring, Results and Review.
