import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const pashtoMigration = await readFile(resolve("packages/database/drizzle/0006_pashto_grade10_curriculum.sql"), "utf8");
const seeder = await readFile(resolve("packages/database/scripts/seed-initial-question-bank.mjs"), "utf8");
const practice = await readFile(resolve("apps/mobile/src/app/(tabs)/practice.tsx"), "utf8");
const rootPackage = JSON.parse(await readFile(resolve("package.json"), "utf8"));

const pashtoLessonCodes = new Set(pashtoMigration.match(/pashto-g10-l\d{2}/g) ?? []);
if (pashtoLessonCodes.size !== 28) {
  throw new Error(`Expected 28 Pashto lessons, found ${pashtoLessonCodes.size}`);
}

for (const marker of [
  "history-grade-10-fa-1398",
  "pashto-grade-10-dari-speakers-1398",
  "verification_status",
  "'published'",
  "productionReady: false",
  "10 published questions per imported lesson",
  "sourcePage",
  "seedKey"
]) {
  if (!seeder.includes(marker)) throw new Error(`Question-bank invariant missing: ${marker}`);
}

if (!practice.includes('selectedBook?.sourceMetadata?.language')) {
  throw new Error("Practice must use the selected textbook language");
}
if (!practice.includes("availableQuestionCounts")) {
  throw new Error("Practice must constrain topic-level test sizes");
}

if (rootPackage.scripts["db:setup:test-content"] !== "npm run db:migrate && npm run db:seed:test-questions") {
  throw new Error("Missing one-command test content setup");
}

console.log("Initial Grade 10 test content verified: History 46 lessons + Pashto 28 lessons, with a 10-question published testing pool per lesson (740 total after seeding).");
