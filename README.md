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
```

For browser/same-network development, `npm run dev:lan -- --clear` remains available.

For normal testing on a physical Android phone, the preferred workflow is now a **preview APK + EAS Update**:

1. Link/configure the app once with `npm run eas:link` and `npm run eas:update:configure`.
2. Configure a stable public HTTPS `EXPO_PUBLIC_API_URL` in the EAS `preview` environment.
3. Run `npm run verify:eas-update`.
4. Build/install the preview APK once with `npm run build:android:preview`.
5. For normal JS/UI changes, publish with:

```powershell
npm run update:preview -- --message "Describe the change"
```

The installed preview APK uses the `preview` update channel and checks for compatible updates on launch. Normal laptop Wi-Fi IP changes therefore do not affect Metro because the installed APK no longer depends on a local Metro server.

See `docs/EAS-UPDATES.md` for the full one-time setup, stable API requirement, update workflow, and cases that still require a new APK.

The older `dev:anywhere` and `dev:tailscale` launchers remain in the repository as optional network diagnostics, not as the primary physical-phone workflow.

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
