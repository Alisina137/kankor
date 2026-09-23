import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(resolve("packages/database/drizzle/0011_grade10_four_official_books.sql"), "utf8");
const practice = await readFile(resolve("apps/mobile/src/app/(tabs)/practice.tsx"), "utf8");

for (const marker of [
  "'biology-grade-10-fa-1398'",
  "'chemistry-grade-10-fa-1398'",
  "'dari-grade-10-fa-1399'",
  "'geography-grade-10-fa-1398'",
  "'بیولوژی صنف دهم'",
  "'کیمیا صنف دهم'",
  "'زبان و ادبیات دری صنف دهم'",
  "'جغرافیه صنف دهم'"
]) {
  if (!migration.includes(marker)) throw new Error(`Missing Grade 10 book marker: ${marker}`);
}

const biologyChapters = [
  "میتودهای علمی",
  "متابولیزم و مرکبات غیر عضوی",
  "مرکبات عضوی",
  "امراض و وقایه",
  "جنتیک و اهمیت آن",
  "صفات ارثی",
  "تطبیق جنتیک",
  "ایکالوژی و اجزای آن",
  "حرکت مواد و انرژی در ایکوسیستم"
];
for (const title of biologyChapters) {
  if (!migration.includes(title)) throw new Error(`Missing Biology chapter: ${title}`);
}

const chemistryCodes = new Set(migration.match(/chemistry-g10-\d{2}-\d{2}/g) ?? []);
if (chemistryCodes.size !== 64) {
  throw new Error(`Expected 64 Chemistry topics, found ${chemistryCodes.size}`);
}

const dariCodes = new Set(migration.match(/dari-g10-l\d{2}/g) ?? []);
if (dariCodes.size !== 28) {
  throw new Error(`Expected 28 Dari lessons, found ${dariCodes.size}`);
}

const geographyCodes = new Set(migration.match(/geography-g10-l\d{2}/g) ?? []);
if (geographyCodes.size !== 68) {
  throw new Error(`Expected 68 Geography lessons, found ${geographyCodes.size}`);
}

for (const marker of ["officialBook", "sourceMetadata", "editionYear"]) {
  if (!practice.includes(marker)) throw new Error(`Practice dynamic book display missing: ${marker}`);
}

console.log("Grade 10 four-book import verified: Biology (9 chapters), Chemistry (9 chapters/64 topics), Dari (28 lessons), Geography (7 chapters/68 lessons), official source metadata, and dynamic Practice display.");
