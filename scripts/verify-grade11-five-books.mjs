import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(resolve("packages/database/drizzle/0012_grade11_five_official_books.sql"), "utf8");

for (const marker of [
  "'biology-grade-11-fa-1398'",
  "'chemistry-grade-11-fa-1398'",
  "'dari-grade-11-fa-1399'",
  "'geography-grade-11-fa-1398'",
  "'history-grade-11-fa-1398'",
  "'بیولوژی صنف یازدهم'",
  "'کیمیا صنف یازدهم'",
  "'زبان و ادبیات دری صنف یازدهم'",
  "'جغرافیه صنف یازدهم'",
  "'تاریخ صنف یازدهم'"
]) {
  if (!migration.includes(marker)) throw new Error(`Missing Grade 11 book marker: ${marker}`);
}

const biology = new Set(migration.match(/biology-g11-c\d{2}/g) ?? []);
const chemistry = new Set(migration.match(/chemistry-g11-c\d{2}/g) ?? []);
const dari = new Set(migration.match(/dari-g11-l\d{2}/g) ?? []);
const geography = new Set(migration.match(/geography-g11-l\d{2}/g) ?? []);
const history = new Set(migration.match(/history-g11-l\d{2}/g) ?? []);

if (biology.size !== 12) throw new Error(`Expected 12 Biology chapters/topics, found ${biology.size}`);
if (chemistry.size !== 11) throw new Error(`Expected 11 Chemistry chapters/topics, found ${chemistry.size}`);
if (dari.size !== 28) throw new Error(`Expected 28 Dari lessons, found ${dari.size}`);
if (geography.size !== 54) throw new Error(`Expected 54 Geography lessons, found ${geography.size}`);
if (history.size !== 38) throw new Error(`Expected 38 History topics, found ${history.size}`);

for (const marker of [
  '"sourceType":"official_textbook"',
  '"language":"fa"',
  '"sourceFilename":"G11-Dr-Biology.pdf"',
  '"sourceFilename":"G11-Dr-Chemistry.pdf"',
  '"sourceFilename":"G11-Dr-Dari(1).pdf"',
  '"sourceFilename":"G11-Dr-Geography.pdf"',
  '"sourceFilename":"G11-Dr-History.pdf"'
]) {
  if (!migration.includes(marker)) throw new Error(`Missing official source metadata: ${marker}`);
}

console.log("Grade 11 five-book import verified: Biology 12 chapters, Chemistry 11 chapters, Dari 28 lessons, Geography 7 chapters/54 lessons, History 38 topics, with official source metadata.");
