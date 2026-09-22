import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0002_curriculum_questions.sql",
  "apps/api/src/modules/curriculum/routes.ts",
  "apps/api/src/modules/questions/routes.ts",
  "apps/api/src/modules/admin/curriculum-routes.ts",
  "apps/api/src/modules/admin/question-routes.ts",
  "apps/api/src/common/admin-auth.ts",
  "apps/mobile/src/app/(tabs)/practice.tsx",
  "apps/admin/app/page.tsx"
];

for (const file of required) await access(resolve(file));

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const entity of ["subjects", "grades", "books", "chapters", "topics", "questions", "questionTranslations"]) {
  if (!schema.includes(`export const ${entity}`)) throw new Error(`Missing schema entity: ${entity}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0002_curriculum_questions.sql"), "utf8");
for (const table of ["grades", "subjects", "books", "chapters", "topics", "questions", "question_translations"]) {
  if (!migration.includes(`"${table}"`)) throw new Error(`Missing migration table: ${table}`);
}

const publicQuestions = await readFile(resolve("apps/api/src/modules/questions/routes.ts"), "utf8");
if (publicQuestions.includes("correctChoice: schema.questions.correctChoice")) {
  throw new Error("Student-facing question API must not expose correctChoice");
}
if (!publicQuestions.includes("subject:") || !publicQuestions.includes("grade:") || !publicQuestions.includes("book:") || !publicQuestions.includes("chapter:") || !publicQuestions.includes("topic:")) {
  throw new Error("Question traceability projection is incomplete");
}

const adminQuestions = await readFile(resolve("apps/api/src/modules/admin/question-routes.ts"), "utf8");
for (const marker of ["verificationStatus", "correctChoice", "workedSolution", "sourceMetadata", "version"]) {
  if (!adminQuestions.includes(marker)) throw new Error(`Missing admin question field: ${marker}`);
}

const api = await readFile(resolve("apps/api/src/app.ts"), "utf8");
for (const moduleName of ["curriculumRoutes", "questionRoutes", "adminCurriculumRoutes", "adminQuestionRoutes"]) {
  if (!api.includes(moduleName)) throw new Error(`API module not registered: ${moduleName}`);
}

console.log("Phase 3 structure verified: curriculum hierarchy, question traceability, protected admin management, and student browsing are present.");
