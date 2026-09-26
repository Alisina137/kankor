import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0008_progress_mistakes.sql",
  "apps/api/src/modules/progress/service.ts",
  "apps/api/src/modules/progress/routes.ts",
  "apps/mobile/src/app/(tabs)/progress.tsx",
  "apps/mobile/src/app/mistakes.tsx"
];

for (const file of required) await readFile(resolve(file), "utf8");

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const marker of [
  "mistakeItems",
  "topicMastery",
  "firstMissedAt",
  "timesMissed",
  "eventuallyMastered",
  "accuracyPercentage",
  "userQuestionUnique",
  "userTopicUnique"
]) {
  if (!schema.includes(marker)) throw new Error(`Phase 7 schema invariant missing: ${marker}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0008_progress_mistakes.sql"), "utf8");
for (const marker of [
  "mistake_items",
  "topic_mastery",
  "first_missed_at",
  "eventually_mastered",
  "accuracy_percentage"
]) {
  if (!migration.includes(marker)) throw new Error(`Phase 7 migration invariant missing: ${marker}`);
}

const service = await readFile(resolve("apps/api/src/modules/progress/service.ts"), "utf8");
for (const marker of [
  "refreshProgressForAttempt",
  "rebuildAllProgress",
  "curriculumSnapshot",
  "snapshotTopicId",
  "eventuallyMastered",
  "onConflictDoUpdate"
]) {
  if (!service.includes(marker)) throw new Error(`Progress recalculation invariant missing: ${marker}`);
}

const scoring = await readFile(resolve("apps/api/src/modules/results/service.ts"), "utf8");
if (!scoring.includes("refreshProgressForAttempt")) {
  throw new Error("Scoring must refresh longitudinal progress");
}

const routes = await readFile(resolve("apps/api/src/modules/progress/routes.ts"), "utf8");
for (const marker of [
  '"/progress/overview"',
  '"/progress/subjects"',
  '"/progress/topics"',
  '"/progress/history"',
  '"/mistakes"',
  '"/mistakes/:questionId/practice"',
  '"/progress/topics/:topicId/practice"',
  "rebuildAllProgress",
  "PRACTICE_SCORING_RULES"
]) {
  if (!routes.includes(marker)) throw new Error(`Phase 7 API capability missing: ${marker}`);
}

const app = await readFile(resolve("apps/api/src/app.ts"), "utf8");
const currentPhase = Number(app.match(/phase:\s*(\d+)/)?.[1] ?? 0);
if (!app.includes("progressRoutes") || currentPhase < 7) {
  throw new Error("Progress routes or Phase 7+ API status missing");
}

const progressPage = await readFile(resolve("apps/mobile/src/app/(tabs)/progress.tsx"), "utf8");
for (const marker of [
  "/progress/overview",
  "/progress/topics",
  "/progress/subjects",
  "/progress/history",
  "/mistakes",
  "Practice this topic"
]) {
  if (!progressPage.includes(marker)) throw new Error(`Progress UI capability missing: ${marker}`);
}

const mistakesPage = await readFile(resolve("apps/mobile/src/app/mistakes.tsx"), "utf8");
for (const marker of [
  "/mistakes",
  "eventuallyMastered",
  "timesMissed",
  "/practice"
]) {
  if (!mistakesPage.includes(marker)) throw new Error(`Mistake Notebook capability missing: ${marker}`);
}

const resultPage = await readFile(resolve("apps/mobile/src/app/result/[attemptId].tsx"), "utf8");
if (!resultPage.includes("/progress/topics/")) {
  throw new Error("Result recommendation must support targeted re-practice");
}

const reviewPage = await readFile(resolve("apps/mobile/src/app/review/[attemptId].tsx"), "utf8");
if (!reviewPage.includes("/progress/topics/")) {
  throw new Error("Question review must support targeted re-practice");
}

console.log("Phase 7 structure verified: mistake notebook, deterministic longitudinal recalculation, topic mastery, subject/topic trends, performance history, and targeted re-practice are present.");
