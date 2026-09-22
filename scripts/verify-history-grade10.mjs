import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(resolve("packages/database/drizzle/0005_history_grade10_curriculum.sql"), "utf8");
const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
const practice = await readFile(resolve("apps/mobile/src/app/(tabs)/practice.tsx"), "utf8");
const admin = await readFile(resolve("apps/admin/app/page.tsx"), "utf8");

for (const marker of [
  "'history'",
  "'history-grade-10-fa-1398'",
  "'تاریخ صنف دهم'",
  "'آریایی‌ها'",
  "'مدنیت‌های اولیه در افغانستان'",
  "'مدنیت‌های قدیم جهان'",
  "'تاریخ اسلام'"
]) {
  if (!migration.includes(marker)) throw new Error(`Missing Grade 10 History curriculum marker: ${marker}`);
}

const lessonCodes = migration.match(/history-g10-l\d{2}/g) ?? [];
const uniqueLessons = new Set(lessonCodes);
if (uniqueLessons.size !== 46) {
  throw new Error(`Expected 46 History lessons, found ${uniqueLessons.size}`);
}

if (!schema.includes('sourceMetadata: jsonb("source_metadata")')) {
  throw new Error("Book source metadata field is missing from the schema");
}

for (const marker of ["officialBook", "editionYear", "sourceMetadata"]) {
  if (!practice.includes(marker)) throw new Error(`Practice book presentation missing: ${marker}`);
}

if (!admin.includes("کتاب‌های نصاب واردشده")) {
  throw new Error("Admin imported-book summary is missing");
}

console.log("Grade 10 History import verified: 1 official book, 4 chapters, 46 lessons, source metadata, mobile display, and admin summary.");
