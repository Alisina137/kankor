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

const biologyChapters = [
  "مطالعه حجره و انواع میکروسکوپ‌ها",
  "ساختمان حجره، حجره پروکاریوت و یوکاریوت و اعضای حجره یوکاریوت",
  "حجره و محیط آن، انتقال غیر فعال و انتقال فعال",
  "ترکیب کیمیایی",
  "تنفس حجروی",
  "دوران حجره و تقسیم حجروی",
  "طبقه‌بندی حیوانات غیر فقاریه و مشخصات آن‌ها",
  "مقایسه سیستم‌های حیوانات غیر فقاریه",
  "حیوانات فقاریه و مشخصات حیوانات فقاریه",
  "مقایسه سیستم‌های فقاریه",
  "عمل متقابل بین جمعیت‌ها",
  "بایوم‌ها"
];
const chemistryChapters = [
  "غلظت محلول‌ها",
  "خواص محلول‌ها",
  "سرعت تعاملات کیمیاوی",
  "تعادل کیمیاوی",
  "محلول‌های آبی تیزاب‌ها و القلی‌ها",
  "تعاملات تیزاب‌ها و القلی‌ها",
  "تولید برق از تعاملات کیمیاوی",
  "تجزیه برقی",
  "فلزات",
  "غیر فلزات",
  "عناصر شبه فلزات"
];
for (const title of biologyChapters) if (!migration.includes(title)) throw new Error(`Missing Biology chapter: ${title}`);
for (const title of chemistryChapters) if (!migration.includes(title)) throw new Error(`Missing Chemistry chapter: ${title}`);

const dari = new Set(migration.match(/dari-g11-l\d{2}/g) ?? []);
const geography = new Set(migration.match(/geography-g11-l\d{2}/g) ?? []);
const history = new Set(migration.match(/history-g11-l\d{2}/g) ?? []);
if (dari.size !== 28) throw new Error(`Expected 28 Dari lessons, found ${dari.size}`);
if (geography.size !== 54) throw new Error(`Expected 54 Geography lessons, found ${geography.size}`);
if (history.size !== 38) throw new Error(`Expected 38 History topics, found ${history.size}`);
if (!migration.includes("'biology-g11-c'||lpad")) throw new Error("Biology dynamic topic-code generation missing");
if (!migration.includes("'chemistry-g11-c'||lpad")) throw new Error("Chemistry dynamic topic-code generation missing");

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
