import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0004_scoring_results_review.sql",
  "apps/api/src/modules/results/service.ts",
  "apps/api/src/modules/results/routes.ts",
  "apps/mobile/src/app/result/[attemptId].tsx",
  "apps/mobile/src/app/review/[attemptId].tsx",
  "apps/admin/app/exams/page.tsx"
];

for (const file of required) await access(resolve(file));

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const entity of ["attemptResults", "attemptAnalyses"]) {
  if (!schema.includes(`export const ${entity}`)) throw new Error(`Missing Phase 5 schema entity: ${entity}`);
}
for (const marker of ["scoringRules", "scoringSnapshot", "explanationSnapshot", "awardedScore"]) {
  if (!schema.includes(marker)) throw new Error(`Missing Phase 5 snapshot field: ${marker}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0004_scoring_results_review.sql"), "utf8");
for (const marker of ["attempt_results", "attempt_analyses", "scoring_rules", "scoring_snapshot", "explanation_snapshot", "awarded_score"]) {
  if (!migration.includes(marker)) throw new Error(`Missing Phase 5 migration marker: ${marker}`);
}

const generation = await readFile(resolve("apps/api/src/modules/exams/service.ts"), "utf8");
for (const marker of [
  "PRACTICE_SCORING_RULES",
  "parseScoringRules",
  "scoringSnapshot",
  "shortExplanation",
  "detailedExplanation",
  "workedSolution"
]) {
  if (!generation.includes(marker)) throw new Error(`Exam scoring/review snapshot invariant missing: ${marker}`);
}

const examRoutes = await readFile(resolve("apps/api/src/modules/exams/routes.ts"), "utf8");
if (!examRoutes.includes("scoring_rules_required")) throw new Error("Full Kankor must require configured scoring rules");

const scoring = await readFile(resolve("apps/api/src/modules/results/service.ts"), "utf8");
for (const marker of [
  "correctMultiplier",
  "incorrectMultiplier",
  "unansweredMultiplier",
  "floorAtZero",
  "bySubject",
  "byGrade",
  "byBook",
  "byChapter",
  "byTopic",
  "byDifficulty",
  "strongestAreas",
  "weakestAreas",
  "recommendation",
  "onConflictDoNothing"
]) {
  if (!scoring.includes(marker)) throw new Error(`Scoring/analysis invariant missing: ${marker}`);
}

const attempts = await readFile(resolve("apps/api/src/modules/attempts/routes.ts"), "utf8");
if (!attempts.includes("scoreAttempt")) throw new Error("Submission must invoke server-side scoring");
if (!attempts.includes('status: "submitted"')) throw new Error("Attempt must lock before scoring");
if (!attempts.includes("alreadySubmitted")) throw new Error("Duplicate submission must remain idempotent");

const results = await readFile(resolve("apps/api/src/modules/results/routes.ts"), "utf8");
for (const marker of [
  '"/attempts/:id/result"',
  '"/attempts/:id/review"',
  '"/attempts/completed"',
  "correctChoiceSnapshot",
  "explanationSnapshot"
]) {
  if (!results.includes(marker)) throw new Error(`Result/review API capability missing: ${marker}`);
}

const resultPage = await readFile(resolve("apps/mobile/src/app/result/[attemptId].tsx"), "utf8");
for (const marker of ["correctCount", "incorrectCount", "unansweredCount", "totalTimeSeconds", "bySubject", "byTopic", "recommendation"]) {
  if (!resultPage.includes(marker)) throw new Error(`Mobile result capability missing: ${marker}`);
}

const reviewPage = await readFile(resolve("apps/mobile/src/app/review/[attemptId].tsx"), "utf8");
for (const marker of ["correctChoice", "selectedChoice", "shortExplanation", "detailedExplanation", "workedSolution", "curriculum", "flagged"]) {
  if (!reviewPage.includes(marker)) throw new Error(`Mobile review capability missing: ${marker}`);
}

console.log("Phase 5 structure verified: server-authoritative scoring, versioned scoring snapshots, immutable results, multidimensional analysis, result history, answer review, explanations, and worked solutions are present.");
