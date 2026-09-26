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
Phase 9 — Administration and Content Quality completed in source.

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

### Phase 8
- Configurable BillingPlan, Subscription, PaymentTransaction, and EntitlementUsage entities.
- Historical forms carry free/premium access tiers so selected forms can remain free.
- Free-plan numerical limits live in app configuration and are explicitly development defaults, not final product pricing/policy.
- Premium entitlement is server-derived from a verified active subscription; the client cannot self-activate Premium.
- Active subscriptions expire through server reconciliation without deleting accounts, attempts, scores, mistakes, or progress history.
- Exam starts enforce per-mode limits, targeted-exam size limits, and a daily free-question allowance.
- Existing in-progress attempts remain usable if Premium expires after the attempt started.
- Historical archive start enforces free selected forms, Premium-only forms, and configurable free daily historical limits.
- Free users retain basic results/review/progress; deep analytics, detailed explanations/worked solutions, Mistake Notebook, weakness practice, and extended history are Premium boundaries.
- Checkout requests require idempotency keys; duplicate confirmation/webhook delivery does not create duplicate Premium activation.
- Development uses a simulated provider with a separate server confirmation step.
- Production-facing webhook path requires BILLING_WEBHOOK_SECRET and leaves provider-specific integration abstract.
- Admin can configure plans/prices/durations, activate plans, inspect subscriptions/payments, and update free limits remotely.
- Mobile Premium screen supports plan selection, pending checkout, simulated confirmation, entitlement refresh, and cancel-at-period-end.
- Phase 8 structural verifier.

### Phase 9
- Role-scoped administration separates content review, content management, operational billing, and super-admin role management.
- Question lifecycle is explicit: Draft → Review → Approved → Published → Deprecated. Direct status PATCH bypass is blocked.
- ContentReview records preserve reviewer decisions, notes, and publication criteria.
- Publish criteria require complete choices/correct answer/curriculum mapping/source labeling/short explanation and enforce rendering or worked-solution checks when flagged in source metadata.
- Question translations have independent verification state/version and independent review records.
- Published/deprecated questions cannot be edited in place. Corrections create a new Draft question version linked by supersedesQuestionId and deprecate the previous published record.
- Existing exam snapshots and historical form mappings therefore continue to reference the original question record/version.
- QuestionRevision snapshots preserve prior editorial states, including a Phase 9 baseline backfill for existing questions.
- Bulk question import supports validate-only and apply modes, row-level validation, topic existence validation, Draft-only insertion, and import batch reports.
- Internal content-quality reports support question, incorrect-answer, explanation, translation, rendering, curriculum-mapping, provenance, and other issue types.
- Audit logs record key question lifecycle, correction, translation, bulk-import, report, configuration, and role-change actions.
- Administration dashboard exposes users, active students, completed exams, question health, report health, and payment activity.
- Basic user visibility and super-admin-only role changes are available.
- Generic app configuration is administrable with audit history.
- Content Quality web console provides review queue, safe correction/version history, bulk import, reports, audit log, and user visibility.
- Student-facing question-report submission remains V1.1 as specified; Phase 9 implements the internal editorial/reporting system without silently expanding MVP scope.
- Phase 9 structural verifier.

## Verification status
- Phase 2 account flow was locally verified by the user.
- Phase 3 admin access was locally verified by the user.
- Phase 4 source was repaired after the user's TypeScript report; the attempt router was restored on main.
- Phase 5 critical scoring, result, review, and configuration files were reviewed after writes.
- `scripts/verify-phase5.mjs` validates scoring snapshots, server scoring, immutable result entities, multidimensional analysis, result/review endpoints, mobile results, explanations, and worked solutions.
- Full dependency install, database migration, TypeScript checks, builds, and runtime submit→result→review testing require local verification after pull.

## Known issues / external requirements
- After pulling database/schema changes, run `npm run db:migrate` and then `npm run db:verify` against the repository-root `.env` before starting the API.
- Existing full-Kankor blueprints created before Phase 5 do not automatically receive invented scoring rules. Edit/recreate them with verified scoring multipliers before starting a new full Kankor exam.
- Existing pre-Phase-5 full-Kankor exams without a scoring snapshot cannot be authoritatively scored; start a new exam after configuring the blueprint.
- Targeted practice uses the documented internal marks-based scoring snapshot: correct = question marks, incorrect = 0, unanswered = 0.
- The product owner still needs to supply/verify authoritative curriculum, questions, and annual Kankor scoring policy.
- Historical archive infrastructure is complete, but no real historical Kankor papers have been imported yet because authoritative source forms have not been supplied.
- No final Premium price is hard-coded. Administrators must create/activate plans after willingness-to-pay validation.
- Development checkout uses the simulated provider only. Production payment availability, app-store policy, provider credentials, webhook signature method, and legal/privacy obligations must be rechecked before commercial launch.

### Post-Phase-9 stability audit
- Expo mobile configuration reads EXPO_PUBLIC_API_URL from the repository-root .env, so a second mobile env file is not required.
- Expected API connectivity failures no longer use console.warn/LogBox warnings.
- Mobile API requests classify network, rate-limit, and server failures and use bounded request timeouts.
- Registration/login/recovery/reset expose precise localized errors and normalize email addresses before sending.
- Temporary startup connectivity failures no longer erase a valid saved session; the user gets an explicit retry state.
- Expo tunnel dependency is declared in the mobile workspace for reproducible tunnel development.
- Attempt submission carries the final local answer snapshot so last-second/offline answers are revision-upserted before scoring.
- PostgreSQL migration tooling pins sslmode=verify-full to preserve current certificate-verification semantics.
- API startup validates API_PORT, verifies the runtime auth database schema before listening, and logs the deepest database error cause when readiness fails.
- Migration tooling refuses to proceed when `DATABASE_URL` and `DIRECT_DATABASE_URL` point to different Neon database targets, preventing migrations from silently landing on a different branch/database.
- `npm run db:verify` checks the runtime database, authentication schema, complete migration ledger, and complete Grade 10/11 curriculum before local API testing; PostgreSQL SSL modes are normalized to `verify-full` to avoid the pg v9 compatibility warning.
- `npm run dev:lan -- --clear` is the normal physical-device development launcher: it validates the LAN host, verifies the database, starts the API, waits for `/health`, and only then starts Expo LAN mode. On Windows it invokes npm through Node's `npm_execpath` instead of spawning `npm.cmd` directly, avoiding Node 24 `EINVAL`.
- verify:stability and verify:dev-network guard the repaired paths.
- Grade 10 and Grade 11 official textbook curriculum imports are present through migration 0015.
- The five remaining supplied Grade 10 textbooks are represented by migration 0015: Geology, Islamic Education (Hanafi), Mathematics, Physics, and Tafseer Sharif. Together with the six previously imported Grade 10 books, Grade 10 now has 11 active official textbooks.
- Migration 0015 preserves the source curriculum structure: Geology 8 sections/21 chapter topics, Islamic Education 3 sections/47 lessons, Mathematics 9 chapters, Physics 9 chapters, and Tafseer Sharif 24 lessons.
- The five remaining supplied Grade 11 textbooks are represented by migrations 0013–0014: Islamic Education (Hanafi), Mathematics, Pashto for Dari speakers, Physics, and Tafseer Sharif. Source metadata is aligned with the uploaded PDFs.
- Migration 0013 preserves Pashto source lesson titles in both `title_fa` (required schema fallback) and `title_ps`, avoiding the previous `23502` NOT NULL failure without inventing Dari lesson translations.
- Practice curriculum navigation is grade-aware: after a grade is selected, the API returns only subjects with active books for that grade, preventing misleading empty book lists.
- Practice now exposes per-level loading states for Grade → Subject → Book → Chapter → Topic, clears stale child selections immediately when a parent changes, ignores late responses from obsolete selections, and shows localized gentle empty-state messages when a successful request returns no items.
- Practice adapts the hierarchy to book structure: books with exactly one chapter auto-select that chapter and go directly from Book → Topic; books with two or more chapters keep the explicit Chapter step, while zero-chapter books show the gentle empty state.
- Practice also adapts the final layer: when a selected chapter has exactly one topic, the Topic step is hidden and the chapter itself remains the practice scope; two or more topics show the Topic selector, while zero topics show the gentle empty state.
- Practice titles are count-aware: each layer uses its singular label for exactly one item and its plural label for multiple items (Class/Classes, Subject/Subjects, Book/Books, Chapter/Chapters, Topic/Topics), localized in Dari, Pashto, and English.
- Historical Archive Year, Province, and Round filters use select-style controls instead of free text. Their option lists are derived from all published historical forms, remain stable while filters are applied, include an All option, and expose every currently available value.
- Runtime database verification checks that Grade 10 contains at least 11 active official books and Grade 11 contains at least 10 active official books.

## Latest source baseline
Post-Phase-9 auth/database, Windows-safe LAN startup, and complete Grade 10/11 Practice curriculum hardening prepared for `main`.

## Next phase
Phase 10 — Release Readiness.
