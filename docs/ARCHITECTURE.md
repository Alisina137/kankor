# KankorPrep Architecture

KankorPrep is a TypeScript npm-workspace monorepo implemented as a structured monolith.

## Applications

- Mobile: Expo SDK 57 / React Native 0.86 / Expo Router
- Admin: Next.js 16
- API: Fastify 5
- Database: PostgreSQL (Neon-compatible) + Drizzle ORM

## Shared packages

- `@kankor/config`: localization metadata, messages, and design tokens
- `@kankor/database`: schema, database client, readiness checks, migrations, and verification tooling

## Runtime boundaries

- The mobile app uses opaque bearer sessions stored with Expo SecureStore.
- The admin app calls the same API and relies on server-enforced role permissions.
- The API is the authority for authentication, permissions, entitlements, scoring, attempt ownership, publication lifecycle, and billing state.
- PostgreSQL stores curriculum, immutable exam snapshots, attempts, results, progress, historical forms, billing, content-quality records, and audit history.

## Release architecture

- Development permits LAN HTTP endpoints for physical-device testing.
- Production API/admin/mobile configuration rejects missing or insecure public endpoints.
- API `/health` provides liveness and `/ready` verifies database readiness.
- Preview Android builds use the EAS `preview` APK profile.
- Production Android builds use the EAS `production` App Bundle profile.
- Production secrets remain outside source control.

See `docs/RELEASE.md` for deployment and release verification.
