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
- RTL localization architecture treats Dari and Pashto as first-class languages; English is secondary.
- Shared design tokens are framework-agnostic; platform UI remains native.
- Annual Kankor rules will be versioned/configurable rather than hard-coded.
- Database foundation is Neon-compatible PostgreSQL; domain schema starts in Phase 3.

## Current implementation phase
Phase 1 — Foundation and Design System.

## Completed phase outcomes
- Mobile application shell with five-tab navigation.
- Shared design tokens.
- Dari, Pashto, English locale architecture and RTL/LTR direction support.
- Next.js admin shell.
- Fastify API with health endpoint.
- PostgreSQL/Drizzle database foundation.
- Environment template and project documentation.

## Verification status
- Repository structure verification script: run successfully in the Phase 1 workspace.
- Full dependency install/typecheck/build could not complete in the execution environment because npm registry access timed out; rerun after pulling locally.

## Known issues
- Authentication, onboarding, curriculum, exam engine, billing, and content administration are intentionally not part of Phase 1.
- Locale persistence and device-wide native RTL switching are deferred to onboarding/preferences work.

## External requirements
- A PostgreSQL/Neon `DATABASE_URL` will be needed when database migrations are introduced/run.

## Latest source baseline
Phase 1 GitHub milestone on `main`.

## Next phase
Phase 2 — Authentication and Onboarding.
