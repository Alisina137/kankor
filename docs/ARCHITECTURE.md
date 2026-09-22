# Architecture — Phase 1

KankorPrep begins as a structured TypeScript monorepo.

- Mobile: Expo SDK 57 / React Native 0.86
- Admin: Next.js 16.3 Active LTS line
- API: Fastify 5 structured monolith foundation
- Database: PostgreSQL (Neon-compatible) + Drizzle ORM
- Shared config: localization metadata and design tokens

The mobile and admin applications intentionally share tokens and locale metadata, while platform-specific components remain platform-native. Product features are implemented in their approved later phases instead of being mocked in Phase 1.
