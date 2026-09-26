# KankorPrep — Phase 10 Release Runbook

## Purpose

Phase 10 makes the existing KankorPrep source safe to validate and package for release without changing the approved product scope.

The source now provides:

- production configuration guards for API, admin, and mobile builds;
- production-safe CORS/origin validation and API security headers;
- database-aware API readiness checks;
- a localized mobile route error fallback;
- Android/iOS build metadata;
- EAS preview and production Android build profiles;
- Expo SDK compatibility checks;
- a production environment template and verifier;
- one integrated source release check and one production release check.

## 1. Install and lock dependencies

From the repository root:

```powershell
cd C:\projects\kankor
npm install
```

A production release must have a committed `package-lock.json`. The repository did not contain one when Phase 10 was implemented, so generate it with the repository's npm version, review it, and commit it before the final production build.

Expo SDK 57 packages are pinned to the release-compatible ranges in `apps/mobile/package.json`. The release check runs `npx expo install --check` to detect drift.

## 2. Source release check

Run:

```powershell
npm run release:check
```

This checks Phases 1–10, RTL/stability invariants, TypeScript, Expo dependency compatibility, API build, and admin build.

The source check deliberately uses a non-routable HTTPS placeholder for the admin build when a production API URL is not configured. It does not claim that production services are reachable.

## 3. Configure production environment

Copy:

```powershell
Copy-Item .env.production.example .env.production
```

Fill `.env.production` with real values. Do not commit it.

Required release properties include:

- `NODE_ENV=production`;
- pooled and direct Neon URLs for the same branch/database;
- `sslmode=verify-full`;
- HTTPS public mobile/admin API URLs;
- exact HTTPS admin origin(s);
- `AUTH_EXPOSE_RECOVERY_TOKEN=false`;
- no bootstrap admin emails after permanent roles are assigned;
- a strong billing webhook secret;
- S3-compatible profile-photo storage credentials (bucket, region, access key, secret key, and optional HTTPS endpoint);
- an intentional `TRUST_PROXY` setting for the hosting topology.

## 4. Production release check

Run:

```powershell
npm run release:check:production
```

To use a different production env file:

```powershell
npm run release:check:production -- --env=.env.production.staging
```

This performs all source checks and additionally validates the production environment and connects to the configured production database with `db:verify`.

A successful command means the automated checks passed. It does not replace the manual smoke tests below.

## 5. API deployment checks

Deploy the API with the production environment configured.

Expected endpoints:

- `GET /health` → HTTP 200, `status: "ok"`;
- `GET /ready` → HTTP 200 only when the runtime authentication/database schema is reachable;
- `GET /ready` → HTTP 503 when the database readiness check fails.

The API refuses production startup when:

- `DATABASE_URL` is missing;
- `AUTH_EXPOSE_RECOVERY_TOKEN=true`;
- `ADMIN_WEB_ORIGIN` is missing, wildcarded, localhost, or non-HTTPS;
- `ADMIN_BOOTSTRAP_EMAILS` is still populated;
- `TRUST_PROXY` is not a supported boolean value.

Set `TRUST_PROXY=true` only when the hosting platform uses a trusted reverse proxy and the API must use forwarded client addresses for rate limiting.

## 6. Admin deployment checks

The Next.js production build now fails if `NEXT_PUBLIC_API_URL` is absent, localhost, or non-HTTPS.

The admin response also sets:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- no Next.js `X-Powered-By` header.

Build/deploy the admin with the real production `NEXT_PUBLIC_API_URL` embedded at build time.

## 7. Mobile preview and production builds

The mobile production profile rejects a missing, localhost, or non-HTTPS `EXPO_PUBLIC_API_URL`.

Before the first EAS build, the product owner must link the project to their Expo/EAS account and configure credentials/secrets:

```powershell
cd C:\projects\kankor\apps\mobile
eas login
eas init
```

Do not commit Expo credentials or production secrets.

Return to the repository root.

Preview APK:

```powershell
npm run build:android:preview
```

Production Android App Bundle:

```powershell
npm run build:android:production
```

The production profile sets `KANKOR_RELEASE_BUILD=true`, which activates the mobile production URL guard.

## 8. Manual smoke checklist

Run these against the same candidate build/environment that will be released.

### Authentication and account

- register a new account;
- login/logout;
- session survives app restart;
- onboarding persists language, target year, and preparation level;
- Profile edits language, target year, and preparation level without rerunning onboarding;
- profile photo can be selected/cropped, uploaded, displayed, replaced, and removed;
- unsupported/oversized profile photos are rejected;
- invalid login and rate-limit messages are readable;
- account deletion requires the intended confirmation flow.

### Practice

- Grade → Subject → Book hierarchy loads with loaders and empty states;
- a one-chapter book skips the chapter selector;
- a one-topic chapter skips the topic selector;
- multi-chapter/topic books expose the selectors;
- targeted exams start at subject/book/chapter/topic scope as appropriate;
- final answers persist when submitting immediately after the last choice.

### Exams/results

- configured full Kankor starts successfully;
- unfinished attempt resumes;
- timer state recovers;
- submit is idempotent;
- result totals are correct;
- review shows frozen question/answer/explanation data;
- free/premium depth restrictions are enforced.

### Historical archive

- Year, Province, and Round selects expose all published options;
- combinations filter correctly;
- published form preserves question ordering;
- incomplete forms cannot start;
- free/premium access boundaries are enforced.

### Progress

- a new account sees a useful start-here state instead of a blank page;
- completed exams update the overall score card, trend, learning journey, weak topics, subject bars, and recent results;
- repeated misses appear in Mistake Notebook;
- weakness/topic re-practice starts the expected exam;
- free/premium progress depth remains enforced.

### Administration

- non-admin accounts cannot access protected admin APIs;
- reviewer/content-admin/super-admin boundaries are respected;
- question Draft → Review → Approved → Published lifecycle works;
- published-question correction creates a new version instead of mutating the old one;
- bulk import validate-only/apply behavior works;
- audit entries are created for privileged changes.

## 9. External production blockers still requiring owner/provider input

These are not safe to invent in source and must be completed before the corresponding production feature is advertised.

### Password recovery delivery

The API creates secure reset tokens, but the current source has no production email/SMS delivery provider. In production the raw token is intentionally not returned. Configure and implement an approved delivery provider before relying on self-service password recovery.

### Production payments

The current payment flow is simulated for development and explicitly rejects simulated checkout in production. A real production payment provider, credentials, signature verification details, app-store/payment policy review, and legal/privacy requirements are still required before Premium purchase can launch.

### Historical source material

Historical archive infrastructure is complete, but authoritative historical Kankor papers still need to be supplied, imported, reviewed, and published.

### Scoring and commercial configuration

Verify the authoritative annual Kankor scoring policy, configure the active full-Kankor blueprint, and set the final Premium plan/pricing before launch.

### Profile photo object storage

Profile photo source support is implemented using signed S3-compatible uploads. Before production, configure:

- `PROFILE_PHOTO_S3_BUCKET`;
- `PROFILE_PHOTO_S3_REGION`;
- `PROFILE_PHOTO_S3_ACCESS_KEY_ID`;
- `PROFILE_PHOTO_S3_SECRET_ACCESS_KEY`;
- optional `PROFILE_PHOTO_S3_ENDPOINT` for an S3-compatible provider;
- `PROFILE_PHOTO_S3_FORCE_PATH_STYLE` when required by the provider.

The bucket may remain private. The API signs short-lived PUT and GET URLs; object-store credentials are never sent to the mobile client.

### Store/EAS ownership and branding

The product owner must provide/control:

- Expo/EAS project ownership and signing credentials;
- final app icon/splash/store artwork;
- Play Store/App Store listing text/screenshots;
- privacy policy/support URLs and required store declarations.

## 10. Rollback

Source rollback does not reverse database migrations or external payment/provider events.

Before a production migration:

1. verify `DATABASE_URL` and `DIRECT_DATABASE_URL` target the intended branch/database;
2. run `npm run db:verify`;
3. take the provider-appropriate database backup/branch snapshot;
4. deploy API/admin/mobile independently when possible;
5. keep the previous deploy artifact available for rollback.

The current migration runner is transactional per migration and records applied filenames in `kankor_migrations`.

## Release decision

Do not submit a production store build solely because `release:check` passes. Final release requires:

- `release:check:production` passing;
- manual smoke checklist passing on the release candidate;
- required external blockers for the features being launched resolved;
- final store/EAS credentials and policy information supplied by the product owner.
