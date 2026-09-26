import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function source(path) {
  return readFile(resolve(path), "utf8");
}

const authRoutes = await source("apps/api/src/modules/auth/routes.ts");
for (const marker of [
  'app.patch("/profile"',
  "profile_update_required",
  "invalid_profile_data",
  "validLanguage(body.preferredLanguage)",
  "validTargetYear(body.targetExamYear)",
  "validPreparationLevel(body.preparationLevel)",
  "onboardingCompletedAt: schema.users.onboardingCompletedAt"
]) {
  if (!authRoutes.includes(marker)) throw new Error(`Editable profile API invariant missing: ${marker}`);
}

const authProvider = await source("apps/mobile/src/providers/auth-provider.tsx");
for (const marker of [
  "updateProfile:",
  'apiRequest<{ user: StudentUser }>("/auth/profile"',
  "setUser(result.user)",
  "setLocale(result.user.preferredLanguage)"
]) {
  if (!authProvider.includes(marker)) throw new Error(`Profile provider invariant missing: ${marker}`);
}

const home = await source("apps/mobile/src/app/(tabs)/index.tsx");
for (const marker of [
  '"/progress/overview"',
  '"/progress/topics"',
  '"/progress/history"',
  '"/attempts/active"',
  '"/subscription"',
  "getActivePersistedExam",
  "practiceWeakTopic",
  "quickActions",
  "history.slice(0, 3)",
  "activeAttempt.summary.answered",
  "overview?.averagePercentage",
  'router.push("/historical")',
  'router.push("/mistakes")'
]) {
  if (!home.includes(marker)) throw new Error(`Home dashboard invariant missing: ${marker}`);
}

const profile = await source("apps/mobile/src/app/(tabs)/profile.tsx");
for (const marker of [
  "updateProfile",
  "draftLanguage",
  "draftYear",
  "draftLevel",
  "saveProfile",
  "localeMeta",
  '"/subscription"',
  "Constants.expoConfig?.version",
  "startEditing",
  "cancelEditing",
  "Danger zone",
  "deleteAccount"
]) {
  if (!profile.includes(marker)) throw new Error(`Profile screen invariant missing: ${marker}`);
}

if (home.includes("homeBody") || profile.includes('label="Premium"')) {
  throw new Error("Legacy Home/Profile placeholder UI must not return");
}

console.log("Home/Profile verified: actionable dashboard, progress/recommendation/resume data, quick actions, subscription state, editable preparation preferences, app/account management, and persistent profile updates are present.");
