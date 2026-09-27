import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "apps/api/src/modules/auth/routes.ts",
  "apps/api/src/modules/auth/password.ts",
  "apps/api/src/modules/auth/session.ts",
  "apps/mobile/src/providers/auth-provider.tsx",
  "apps/mobile/src/lib/session-storage.ts",
  "apps/mobile/src/lib/first-run-storage.ts",
  "apps/mobile/src/app/(auth)/welcome.tsx",
  "apps/mobile/src/app/(auth)/login.tsx",
  "apps/mobile/src/app/(auth)/register.tsx",
  "apps/mobile/src/app/(auth)/recovery.tsx",
  "apps/mobile/src/app/(auth)/reset-password.tsx",
  "apps/mobile/src/app/onboarding.tsx",
  "packages/database/drizzle/0001_auth_onboarding.sql"
];

for (const file of required) await access(resolve(file));

const authRoutes = await readFile(resolve("apps/api/src/modules/auth/routes.ts"), "utf8");
for (const endpoint of ["/register", "/login", "/logout", "/refresh", "/recovery", "/reset-password", "/onboarding", "/account"]) {
  if (!authRoutes.includes(endpoint)) throw new Error(`Missing auth endpoint: ${endpoint}`);
}

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const entity of ["users", "sessions", "passwordResetTokens", "onboardingCompletedAt"]) {
  if (!schema.includes(entity)) throw new Error(`Missing auth schema marker: ${entity}`);
}

const root = await readFile(resolve("apps/mobile/src/app/_layout.tsx"), "utf8");
if (!root.includes("AuthProvider")) throw new Error("AuthProvider is not wired into mobile root");

const entry = await readFile(resolve("apps/mobile/src/app/index.tsx"), "utf8");
for (const marker of ["hasSeenIntro", '"/(auth)/login"', '"/(auth)/welcome"']) {
  if (!entry.includes(marker)) throw new Error(`Professional first-run entry invariant missing: ${marker}`);
}

const welcome = await readFile(resolve("apps/mobile/src/app/(auth)/welcome.tsx"), "utf8");
for (const marker of ["markIntroSeen", "AuthIllustration", "getStarted", "slides"]) {
  if (!welcome.includes(marker)) throw new Error(`Professional first-run welcome invariant missing: ${marker}`);
}

const onboarding = await readFile(resolve("apps/mobile/src/app/onboarding.tsx"), "utf8");
for (const marker of [
  "AuthIllustration",
  'variant: "language"',
  'variant: "target"',
  'variant: "level"',
  "progressTrack",
  "stepBadge",
  'params: { welcome: "new" }'
]) {
  if (!onboarding.includes(marker)) throw new Error(`Professional onboarding invariant missing: ${marker}`);
}

const tabs = await readFile(resolve("apps/mobile/src/app/(tabs)/_layout.tsx"), "utf8");
if (!tabs.includes("onboardingCompleted")) throw new Error("Protected tab onboarding guard missing");

console.log("Phase 2 structure verified: auth API, secure sessions, recovery, onboarding, and protected mobile entry are present.");
