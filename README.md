# KankorPrep Afghanistan

Mobile-first Kankor preparation platform with an Expo/React Native student app, Next.js administration, Fastify API, and Neon-compatible PostgreSQL/Drizzle data layer.

## Current source phase

Phase 10 — Release Readiness.

Phases 1–9 implement authentication/onboarding, curriculum and questions, exam generation/attempt resilience, scoring/results/review, historical forms, progress/mistakes, freemium/billing infrastructure, and administration/content quality.

## Development

After cloning:

```powershell
npm install
npm run db:migrate
npm run db:verify
npm run dev:lan -- --clear
```

For a physical Android device, configure `EXPO_PUBLIC_API_URL` in the repository-root `.env` with the laptop LAN address.

## Verification

Source release gate:

```powershell
npm run release:check
```

Production release gate after configuring a private `.env.production`:

```powershell
npm run release:check:production
```

See `docs/PROJECT-STATE.md` for implementation state and `docs/RELEASE.md` for the production release runbook and external launch requirements.
