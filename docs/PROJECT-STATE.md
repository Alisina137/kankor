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

## Architecture decisions
- Monorepo with `apps/mobile`, `apps/admin`, `apps/api`, shared packages.
- RTL localization treats Dari and Pashto as first-class languages; English remains secondary.
- Authentication uses first-party email/password accounts for MVP.
- Passwords use Node scrypt hashing.
- Sessions use random opaque bearer tokens; only SHA-256 token hashes are stored server-side.
- Native mobile session tokens use Expo SecureStore.
- Curriculum is relational and traceable: Subject + Grade → Book → Chapter → Topic → Question.
- Questions preserve source metadata, language, difficulty, marks, explanations, worked solutions, verification state, and version.
- Student-facing question endpoints never expose answer keys.
- Content-admin APIs require an admin role or a bootstrap email from `ADMIN_BOOTSTRAP_EMAILS`.
- Annual Kankor rules remain versioned/configurable rather than hard-coded.
- Database remains Neon-compatible PostgreSQL with Drizzle ORM and deterministic SQL migrations.

## Current implementation phase
Phase 3 — Curriculum and Question System completed in source.

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
- Personalized post-onboarding Home and Profile account controls.
- Secure native session persistence with Expo SecureStore.
- Local user verification confirmed the app, registration flow, and connectivity work after fixes.

### Phase 3
- Grade, Subject, Book, Chapter, Topic, Question, and QuestionTranslation database entities.
- Seeded Grade 10, 11, and 12 structural records only; no invented subject/question content.
- Curriculum migration with relational constraints and indexes.
- Public curriculum APIs for grades, subjects, books, chapters, and topics.
- Published-question APIs that omit correct answers.
- Full question trace response through subject, grade, book, chapter, and topic.
- Protected content-admin CRUD APIs for curriculum.
- Protected question create/edit APIs with draft lifecycle, version increments, source metadata, explanations, worked solutions, and translations.
- Admin authorization with permanent roles plus development/bootstrap email support.
- Web admin console for curriculum and draft-question creation.
- Mobile Practice curriculum browser from grade/subject through topic.
- Phase 3 structural verification script.

## Verification status
- Phase 2 was locally verified by the user after dependency, database, Expo, and API fixes.
- Phase 3 critical files were reviewed after GitHub writes.
- `scripts/verify-phase3.mjs` validates required files, schema entities, migration coverage, API registration, question traceability, and answer-key non-exposure.
- Full Phase 3 dependency install, typecheck, builds, migration execution, and runtime content-admin flow still require local verification after pull.

## Known issues / external requirements
- Run `npm run db:migrate` after pulling Phase 3.
- Add the email of an existing account to `ADMIN_BOOTSTRAP_EMAILS` in the local root `.env` before first admin-console login.
- The bootstrap email mechanism is for initial administration setup; permanent role management and deeper approval/audit workflows belong to later administration phases.
- Production password-recovery delivery (email/SMS) is not configured.
- Phone-number authentication remains optional and was not introduced because no regional SMS provider was approved.
- Diagnostic testing waits for the examination engine.
- Phase 3 does not invent official subjects, textbooks, chapters, topics, or questions; content must be entered/imported from verified sources.

## Latest source baseline
Phase 3 branch awaiting merge to `main`.

## Next phase
Phase 4 — Examination Engine.
