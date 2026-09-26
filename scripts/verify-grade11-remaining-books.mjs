import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(resolve("packages/database/drizzle/0013_grade11_remaining_official_books.sql"), "utf8");

for (const marker of [
  "'islamic-studies-grade-11-hanafi-fa-1398'",
  "'math-grade-11-fa-1398'",
  "'pashto-grade-11-dari-speakers-1398'",
  "'physics-grade-11-fa-1399'"
]) {
  if (!migration.includes(marker)) throw new Error(`Missing Grade 11 remaining-book marker: ${marker}`);
}

const islamic = new Set(migration.match(/islamic-g11-l\d{2}/g) ?? []);
const pashto = new Set(migration.match(/pashto-g11-l\d{2}/g) ?? []);

if (islamic.size !== 42) throw new Error(`Expected 42 Islamic Studies lessons, found ${islamic.size}`);
if (pashto.size !== 28) throw new Error(`Expected 28 Pashto lessons, found ${pashto.size}`);

for (const title of [
  "مقاطع مخروطی","مثلثات","هندسه فضایی","ترادف‌ها و سلسله‌ها",
  "لگاریتم و توابع اکسپوننشیلی","ماتریکس‌ها و دترمینانت‌ها","هندسه تحلیلی","احتمالات"
]) {
  if (!migration.includes(title)) throw new Error(`Missing Math chapter: ${title}`);
}

for (const title of [
  "تعادل میخانیکی","حرکت یک‌بعدی","حرکت‌های دوبعدی","قوانین حرکت نیوتن",
  "کار، انرژی میخانیکی و طاقت","مومنتم خطی و امپولس","سکون نسبی سیال‌ها","سیال‌های متحرک"
]) {
  if (!migration.includes(title)) throw new Error(`Missing Physics chapter: ${title}`);
}

if (!migration.includes("'math-g11-c'||lpad")) throw new Error("Math chapter-topic generation missing");
if (!migration.includes("'physics-g11-c'||lpad")) throw new Error("Physics chapter-topic generation missing");

if (migration.includes("chemistry-grade-11-fa-1398")) {
  throw new Error("Duplicate Grade 11 Chemistry must not be inserted by migration 0013");
}

for (const marker of [
  '"sourceFilename":"G11-Dr-Islamic_Study_Hanafi.pdf"',
  '"sourceFilename":"G11-Dr-Math(1).pdf"',
  '"sourceFilename":"G11-Dr-Pashto.pdf"',
  '"sourceFilename":"G11-Dr-Physic.pdf"',
  '"sourceType":"official_textbook"'
]) {
  if (!migration.includes(marker)) throw new Error(`Missing source metadata: ${marker}`);
}

console.log("Grade 11 remaining-book import verified: Islamic Studies 42 lessons, Math 8 chapters, Pashto 28 lessons, Physics 8 chapters, and no duplicate Chemistry record.");
