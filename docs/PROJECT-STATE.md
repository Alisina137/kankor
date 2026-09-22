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
- Annual Kankor rules remain versioned/configurable rather than hard-coded.
- Database remains Neon-compatible PostgreSQL with Drizzle ORM.

## Current implementation phase
Phase 2 — Authentication and Onboarding completed in source.

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

## Verification status
- Critical Phase 2 files were reviewed from the GitHub branch after writes.
- `scripts/verify-phase2.mjs` is included for local structural verification.
- Full dependency installation, TypeScript checks, builds, migration execution, and runtime E2E could not be executed in the implementation environment because outbound GitHub/npm networking is unavailable and no project database credential is available.
- Phase acceptance requires local/runtime verification of Register → Onboard → Home after installing dependencies and applying the migration.

## Known issues / external requirements
- A valid `DATABASE_URL` is required before running `npm run db:migrate` and the API.
- Production password-recovery delivery (email/SMS) is not configured. Development may expose a reset token only when `AUTH_EXPOSE_RECOVERY_TOKEN=true` and `NODE_ENV` is not production.
- Phone-number authentication remains optional and was not introduced because no regional SMS provider was approved.
- The diagnostic exam offered by the product journey is intentionally deferred until the examination system exists.
- Curriculum and question content begin in Phase 3.

## Latest source baseline
Phase 2 GitHub milestone on `main` after merge.

## Next phase
Phase 3 — Curriculum and Question System.
