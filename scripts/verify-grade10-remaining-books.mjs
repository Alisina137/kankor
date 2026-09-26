import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(
  resolve("packages/database/drizzle/0015_grade10_remaining_official_books.sql"),
  "utf8"
);

for (const marker of [
  "'geology-grade-10-fa-1398'",
  "'islamic-studies-grade-10-hanafi-fa-1398'",
  "'math-grade-10-fa-1398'",
  "'physics-grade-10-fa-1398'",
  "'tafseer-grade-10-fa-1398'",
  '"sourceFilename":"G10-Dr-Geology(1).pdf"',
  '"sourceFilename":"G10-Dr-Islamic_Study_hanafi.pdf"',
  '"sourceFilename":"G10-Dr-Math(1).pdf"',
  '"sourceFilename":"G10-Dr-physic(1).pdf"',
  '"sourceFilename":"G10-Dr-Tafseer(1).pdf"',
  '"sourceType":"official_textbook"'
]) {
  if (!migration.includes(marker)) {
    throw new Error(`Missing Grade 10 remaining-book marker: ${marker}`);
  }
}

const geologyTopics = new Set(migration.match(/geology-g10-t\d{2}/g) ?? []);
const islamicLessons = new Set(migration.match(/islamic-g10-l\d{2}/g) ?? []);
const tafseerLessons = new Set(migration.match(/tafseer-g10-l\d{2}/g) ?? []);

if (geologyTopics.size !== 21) {
  throw new Error(`Expected 21 Grade 10 Geology curriculum topics, found ${geologyTopics.size}`);
}
if (islamicLessons.size !== 47) {
  throw new Error(`Expected 47 Grade 10 Islamic Education lessons, found ${islamicLessons.size}`);
}
if (tafseerLessons.size !== 24) {
  throw new Error(`Expected 24 Grade 10 Tafseer lessons, found ${tafseerLessons.size}`);
}

for (const title of [
  "منرال‌ها",
  "سنگ‌ها",
  "پروسه‌های خارجی",
  "طبقه‌بندی زمین",
  "زلزله",
  "ولکانولوژی",
  "تاریخ زمین",
  "ابحار"
]) {
  if (!migration.includes(title)) throw new Error(`Missing Geology section: ${title}`);
}

for (const title of [
  "پولینوم",
  "رابطه",
  "تابع",
  "توابع مثلثاتی",
  "تطبیقات مثلثات",
  "اعداد مختلط",
  "هندسه تحلیلی",
  "احصائیه",
  "منطق (ریاضی)"
]) {
  if (!migration.includes(title)) throw new Error(`Missing Grade 10 Math chapter: ${title}`);
}

for (const title of [
  "فزیک چیست",
  "اندازه‌گیری",
  "نور و خواص نور",
  "انکسار",
  "عدسیه‌ها",
  "برق ساکن",
  "سرکت و جریان",
  "مقناطیس",
  "القای الکترومقناطیسی و برق متناوب"
]) {
  if (!migration.includes(title)) throw new Error(`Missing Grade 10 Physics chapter: ${title}`);
}

if (!migration.includes("'math-g10-c'||lpad")) {
  throw new Error("Grade 10 Math chapter-topic generation missing");
}
if (!migration.includes("'physics-g10-c'||lpad")) {
  throw new Error("Grade 10 Physics chapter-topic generation missing");
}

console.log(
  "Grade 10 remaining-book import verified: Geology 8 sections/21 topics, Islamic Education 47 lessons, Math 9 chapters, Physics 9 chapters, and Tafseer 24 lessons."
);
