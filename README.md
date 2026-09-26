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

For IP-independent development across home/company/hotspot networks, the preferred development mode is Tailscale:

```powershell
npm run dev:tailscale -- --clear
```

Install Tailscale on both the Windows laptop and the phone, sign both into the same tailnet, and keep Tailscale connected. The launcher discovers the laptop's stable Tailscale IPv4 automatically, verifies the API through that address, injects it into the app, and advertises Metro through the same stable address. Normal Wi-Fi/DHCP IP changes therefore do not matter.

A Cloudflare Quick Tunnel fallback remains available:

```powershell
npm run dev:anywhere -- --clear
```

That fallback depends on the current network allowing access to Cloudflare Quick Tunnel provisioning; restrictive networks can block `api.trycloudflare.com`.

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
