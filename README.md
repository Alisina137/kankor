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

For local Expo/LAN development, `npm run dev:lan -- --clear` remains available.

For normal testing on a physical Android phone, use the **preview APK + EAS Update** workflow:

```powershell
npm run eas:update:configure
npm run verify:eas-update
npm run build:android:preview
```

Install that preview APK once. Afterward, normal JS/TS/React Native/UI changes are published without rebuilding the APK:

```powershell
npm run update:preview -- --message "Describe the update"
```

The preview build listens only to the `preview` channel. Production builds listen only to the `production` channel. Runtime compatibility is derived with Expo's `fingerprint` policy.

A new APK/AAB is still required when native dependencies, Expo/React Native versions, permissions, config plugins, Android native configuration, or other native-runtime inputs change.

See `docs/EAS-UPDATES.md` for the complete first-build, OTA-test, production, and native-change workflow.

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
