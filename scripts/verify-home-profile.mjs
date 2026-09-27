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

const profilePhotoStorage = await source("apps/api/src/modules/auth/profile-photo-storage.ts");
for (const marker of [
  "createProfilePhotoUpload",
  "createProfilePhotoDownloadUrl",
  "verifyProfilePhotoUpload",
  "deleteProfilePhotoObject",
  "MAX_PROFILE_PHOTO_BYTES"
]) {
  if (!profilePhotoStorage.includes(marker)) throw new Error(`Profile photo storage invariant missing: ${marker}`);
}

for (const marker of [
  'app.get("/profile-photo"',
  'app.post("/profile-photo/upload"',
  'app.post("/profile-photo/confirm"',
  'app.delete("/profile-photo"',
  "profilePhotoKey: schema.users.profilePhotoKey",
  "hasProfilePhoto"
]) {
  if (!authRoutes.includes(marker)) throw new Error(`Profile photo API invariant missing: ${marker}`);
}

const authProvider = await source("apps/mobile/src/providers/auth-provider.tsx");
for (const marker of [
  "updateProfile:",
  'apiRequest<{ user: StudentUser }>("/auth/profile"',
  'apiRequest<void>("/auth/logout"',
  'body: JSON.stringify({})',
  'console.info("Remote logout failed; clearing local session anyway"',
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
  'router.push("/mistakes")',
  "welcomeMessage",
  "Animated.sequence",
  "Animated.delay(2200)",
  "welcomeOpacity",
  "welcomeOffset",
  "<Animated.View"
]) {
  if (!home.includes(marker)) throw new Error(`Home dashboard invariant missing: ${marker}`);
}

const login = await source("apps/mobile/src/app/(auth)/login.tsx");
if (!login.includes('params: { welcome: "back" }')) {
  throw new Error("Login must request the one-time welcome-back Home toast");
}

const onboarding = await source("apps/mobile/src/app/onboarding.tsx");
for (const marker of [
  'params: { welcome: "new" }',
  "user?.onboardingCompleted && !busy"
]) {
  if (!onboarding.includes(marker)) throw new Error(`Onboarding welcome invariant missing: ${marker}`);
}

const accountMenu = await source("apps/mobile/src/components/account-menu-button.tsx");
for (const marker of [
  '"/auth/profile-photo"',
  '"/(tabs)/profile"',
  '"/premium"',
  '"/(tabs)/progress"',
  'log-out-outline',
  'await logout()',
  'router.replace("/(auth)/login")',
  "Modal"
]) {
  if (!accountMenu.includes(marker)) throw new Error(`Account menu invariant missing: ${marker}`);
}

const screen = await source("apps/mobile/src/components/screen.tsx");
for (const marker of [
  "AccountMenuButton",
  "showAccountMenu",
  'rootSegment !== "(auth)"',
  'rootSegment !== "onboarding"',
  'rootSegment !== "exam"'
]) {
  if (!screen.includes(marker)) throw new Error(`Shared account header invariant missing: ${marker}`);
}

const resultScreen = await source("apps/mobile/src/app/result/[attemptId].tsx");
if (!resultScreen.includes("AccountMenuButton")) {
  throw new Error("Result screen account menu is missing");
}

const reviewScreen = await source("apps/mobile/src/app/review/[attemptId].tsx");
if (!reviewScreen.includes("AccountMenuButton")) {
  throw new Error("Review screen account menu is missing");
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
  '"/subscription/comparison"',
  "planComparison",
  "activePlanCard",
  "comparisonCard",
  "comparePlans",
  "upgradePremium",
  "managePremium",
  "Promise.allSettled",
  "chooseProfilePhoto",
  "removeProfilePhoto",
  '"/auth/profile-photo/upload"',
  '"/auth/profile-photo/confirm"',
  '"/auth/profile-photo"',
  "expo-image-picker",
  "photoStorageConfigured",
  "Constants.expoConfig?.version",
  "startEditing",
  "cancelEditing",
  "Danger zone",
  "deleteAccount"
]) {
  if (!profile.includes(marker)) throw new Error(`Profile screen invariant missing: ${marker}`);
}

const billingRoutes = await source("apps/api/src/modules/billing/routes.ts");
for (const marker of [
  'app.get("/subscription/comparison"',
  "getFreeEntitlements()",
  "noFreePlanExamLimits",
  "detailedExplanations",
  "workedSolutions",
  "completeAnalytics",
  "mistakeNotebook",
  "weaknessPractice",
  "extendedHistory"
]) {
  if (!billingRoutes.includes(marker)) throw new Error(`Subscription comparison invariant missing: ${marker}`);
}

const progress = await source("apps/mobile/src/app/(tabs)/progress.tsx");
for (const marker of [
  "emptyHero",
  "emptyTitle",
  "startPractice",
  "browseExams",
  "summaryCard",
  "scoreCircle",
  "trendRow",
  "journeyRow",
  "nextStep",
  "weakestTopic",
  "barTrack",
  "history.slice(0, 5)",
  "useFocusEffect",
  "Promise.allSettled"
]) {
  if (!progress.includes(marker)) throw new Error(`Progress UX invariant missing: ${marker}`);
}

if (home.includes("homeBody") || profile.includes('label="Premium"')) {
  throw new Error("Legacy Home/Profile placeholder UI must not return");
}

console.log("Student UX verified: actionable Home dashboard, visual/non-empty Progress states, active subscription comparison, editable preparation preferences, secure profile-photo upload/removal, and account management are present.");
