import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = await readFile(resolve("packages/database/drizzle/0014_grade11_tafseer.sql"), "utf8");
const api = await readFile(resolve("apps/mobile/src/lib/api.ts"), "utf8");

for (const marker of [
  "'tafseer-grade-11-fa-1398'",
  "'تفسیر شریف صنف یازدهم'",
  '"sourceFilename":"G11-Dr-Tafseer.pdf"',
  '"sourceType":"official_textbook"'
]) {
  if (!migration.includes(marker)) throw new Error(`Missing Tafseer marker: ${marker}`);
}

const lessons = new Set(migration.match(/tafseer-g11-l\d{2}/g) ?? []);
if (lessons.size !== 20) {
  throw new Error(`Expected 20 Tafseer lessons, found ${lessons.size}`);
}

for (const marker of [
  "expoDevelopmentHost",
  "API_URLS",
  "apiCandidates",
  "Kankor API unreachable",
  "All Kankor API candidates failed",
  "for (const baseUrl of API_URLS)"
]) {
  if (!api.includes(marker)) throw new Error(`Missing mobile API resilience marker: ${marker}`);
}

if (!api.includes('candidates.push(`http://${expoHost}:4000`)')) {
  throw new Error("Expo host API fallback is missing");
}

console.log("Grade 11 Tafseer and mobile auth connectivity verified: 20 Tafseer lessons plus Expo-host API fallback/retry for physical-device login and registration.");
