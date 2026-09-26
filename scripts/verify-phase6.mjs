import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0007_historical_form_library.sql",
  "apps/api/src/modules/exams/historical-routes.ts",
  "apps/api/src/modules/admin/historical-form-routes.ts",
  "apps/mobile/src/app/historical.tsx",
  "apps/admin/app/historical/page.tsx"
];

for (const file of required) {
  await readFile(resolve(file), "utf8");
}

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const marker of [
  "historicalForms",
  "historicalFormQuestions",
  "historicalFormId",
  "historicalScoringMetadata",
  "originalOrderStatus",
  "sourceReference",
  "sourceStatus"
]) {
  if (!schema.includes(marker)) throw new Error(`Historical schema invariant missing: ${marker}`);
}
if (schema.includes('uniqueIndex("exam_questions_exam_question_unique")')) {
  throw new Error("Historical duplicate questions must be representable in fixed exams");
}

const migration = await readFile(resolve("packages/database/drizzle/0007_historical_form_library.sql"), "utf8");
for (const marker of [
  "historical_forms",
  "historical_form_questions",
  "source_reference",
  "original_order_status",
  "historical_scoring_metadata",
  'DROP INDEX IF EXISTS "exam_questions_exam_question_unique"'
]) {
  if (!migration.includes(marker)) throw new Error(`Historical migration invariant missing: ${marker}`);
}

const routes = await readFile(resolve("apps/api/src/modules/exams/historical-routes.ts"), "utf8");
for (const marker of [
  '"/exams/history"',
  '"/exams/history/:id"',
  '"/exams/history/:id/start"',
  'mode: "historical"',
  "authenticHistoricalForm",
  "originalOrderStatus",
  "relationSourceMetadata",
  "historicalScoringMetadata",
  "practice_fallback"
]) {
  if (!routes.includes(marker)) throw new Error(`Historical student API capability missing: ${marker}`);
}
if (!routes.includes(".orderBy(asc(schema.historicalFormQuestions.order))")) {
  throw new Error("Historical form start must preserve original order");
}

const admin = await readFile(resolve("apps/api/src/modules/admin/historical-form-routes.ts"), "utf8");
for (const marker of [
  '"/historical-forms"',
  '"/historical-forms/:id/questions"',
  '"/historical-forms/:id/import"',
  "historical_form_order_not_contiguous",
  "historical_form_contains_unpublished_questions",
  "published_historical_form_locked"
]) {
  if (!admin.includes(marker)) throw new Error(`Historical admin capability missing: ${marker}`);
}

const app = await readFile(resolve("apps/api/src/app.ts"), "utf8");
if (!app.includes("historicalExamRoutes") || !app.includes("adminHistoricalFormRoutes")) {
  throw new Error("Historical routes are not registered");
}
const currentPhase = Number(app.match(/phase:\s*(\d+)/)?.[1] ?? 0);
if (currentPhase < 6) throw new Error("API health must report Phase 6 or later");

const resultRoutes = await readFile(resolve("apps/api/src/modules/results/routes.ts"), "utf8");
if (!resultRoutes.includes("historical:")) throw new Error("Results must return historical provenance");

const mobile = await readFile(resolve("apps/mobile/src/app/historical.tsx"), "utf8");
for (const marker of [
  "sourceStatus",
  "originalOrderStatus",
  "Start authentic form",
  "/exams/history/",
  "HistoricalFilterOptions",
  "SelectFilter",
  'filterKey="year"',
  'filterKey="province"',
  'filterKey="round"',
  "filterOptions.years.map(String)",
  "filterOptions.provinces",
  "filterOptions.rounds"
]) {
  if (!mobile.includes(marker)) throw new Error(`Historical mobile capability missing: ${marker}`);
}
if (mobile.includes("TextInput")) {
  throw new Error("Historical Year/Province/Round filters must use select controls, not free-text inputs");
}

const adminPage = await readFile(resolve("apps/admin/app/historical/page.tsx"), "utf8");
for (const marker of ["Bulk Import", "sourceStatus", "originalOrderStatus", "verificationStatus"]) {
  if (!adminPage.includes(marker)) throw new Error(`Historical admin UI capability missing: ${marker}`);
}

console.log("Phase 6 structure verified: historical identity, provenance, source uncertainty, original ordering, duplicate preservation, select-based archive filters with complete published options, admin import/publish controls, authentic start, and historical result provenance are present.");
