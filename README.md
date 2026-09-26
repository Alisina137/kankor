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

For normal same-network development, `npm run dev:lan -- --clear` uses the current Expo/LAN host automatically.

For IP-independent development across home/company/hotspot networks, use:

```powershell
npm run dev:anywhere -- --clear
```

This starts/reuses the local API, downloads and SHA-256 verifies a pinned official Cloudflare tunnel binary on first Windows x64 use, creates temporary Quick Tunnels for both the API and Expo/Metro, injects the public API URL into the app, and points Expo at the public Metro URL. No Cloudflare account or token is required. Both laptop and phone need internet access, but they do not need the same LAN or a fixed IP.

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
