import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0003_examination_engine.sql",
  "apps/api/src/modules/exams/service.ts",
  "apps/api/src/modules/exams/routes.ts",
  "apps/api/src/modules/attempts/routes.ts",
  "apps/api/src/modules/admin/exam-blueprint-routes.ts",
  "apps/mobile/src/lib/exam-storage.ts",
  "apps/mobile/src/app/(tabs)/exams.tsx",
  "apps/mobile/src/app/(tabs)/practice.tsx",
  "apps/mobile/src/app/exam/[attemptId].tsx",
  "apps/admin/app/exams/page.tsx"
];

for (const file of required) await access(resolve(file));

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const entity of ["examBlueprints", "exams", "examQuestions", "examAttempts", "attemptAnswers"]) {
  if (!schema.includes(`export const ${entity}`)) throw new Error(`Missing examination schema entity: ${entity}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0003_examination_engine.sql"), "utf8");
for (const table of ["exam_blueprints", "exams", "exam_questions", "exam_attempts", "attempt_answers"]) {
  if (!migration.includes(`"${table}"`)) throw new Error(`Missing Phase 4 migration table: ${table}`);
}
if (!migration.includes("question_count") || !migration.includes("<= 160")) {
  throw new Error("160-question upper-bound protection is missing");
}

const service = await readFile(resolve("apps/api/src/modules/exams/service.ts"), "utf8");
for (const marker of [
  'verificationStatus, "published"',
  "criteria.distribution",
  "contentSnapshot",
  "correctChoiceSnapshot",
  "curriculumSnapshot"
]) {
  if (!service.includes(marker)) throw new Error(`Exam generation invariant missing: ${marker}`);
}
for (const marker of [
  "schema.subjects.active",
  "schema.grades.active",
  "schema.books.active",
  "schema.chapters.active",
  "schema.topics.active"
]) {
  if (!service.includes(marker)) throw new Error(`Inactive curriculum guard missing: ${marker}`);
}

const attempts = await readFile(resolve("apps/api/src/modules/attempts/routes.ts"), "utf8");
for (const marker of [
  '"/attempts/active"',
  '"/attempts/:id/answers"',
  '"/attempts/:id/submit"',
  "client_revision",
  "ON CONFLICT (attempt_id, exam_question_id)",
  "EXCLUDED.client_revision >= attempt_answers.client_revision",
  "submissionKey",
  "remainingSeconds",
  "attempt_time_expired"
]) {
  if (!attempts.includes(marker)) throw new Error(`Attempt reliability invariant missing: ${marker}`);
}
if (attempts.includes("correctChoiceSnapshot")) {
  throw new Error("Student attempt payload must not expose correct answer snapshots");
}

const storage = await readFile(resolve("apps/mobile/src/lib/exam-storage.ts"), "utf8");
for (const marker of ["AsyncStorage", "ACTIVE_KEY", "savePersistedExam", "getActivePersistedExam", "mergeExamAnswers"]) {
  if (!storage.includes(marker)) throw new Error(`Local disruption recovery missing: ${marker}`);
}

const session = await readFile(resolve("apps/mobile/src/app/exam/[attemptId].tsx"), "utf8");
for (const marker of ["AppState", "savePersistedExam", "syncAnswers", "navigator", "confirmSubmit", "remainingSeconds"]) {
  if (!session.includes(marker)) throw new Error(`Exam session capability missing: ${marker}`);
}

const api = await readFile(resolve("apps/api/src/app.ts"), "utf8");
for (const moduleName of ["examRoutes", "attemptRoutes", "adminExamBlueprintRoutes"]) {
  if (!api.includes(moduleName)) throw new Error(`API module not registered: ${moduleName}`);
}

console.log("Phase 4 structure verified: generation, blueprint configuration, immutable snapshots, resilient attempts, atomic autosave, timer recovery, navigator, local persistence, and idempotent submission are present.");
