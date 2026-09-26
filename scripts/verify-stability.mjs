import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const mobileConfig = await readFile(resolve("apps/mobile/app.config.ts"), "utf8");
for (const marker of [
  'resolve(__dirname, "../../.env")',
  'override: true',
  'apiUrl: process.env.EXPO_PUBLIC_API_URL'
]) {
  if (!mobileConfig.includes(marker)) throw new Error(`Mobile root-env invariant missing: ${marker}`);
}

const api = await readFile(resolve("apps/mobile/src/lib/api.ts"), "utf8");
for (const marker of [
  "Constants.expoConfig?.extra?.apiUrl",
  '"rate_limited"',
  '"server_error"',
  "AbortController",
  "console.info"
]) {
  if (!api.includes(marker)) throw new Error(`Mobile API stability invariant missing: ${marker}`);
}
if (api.includes("console.warn")) throw new Error("Expected network failures must not trigger LogBox warnings");

const auth = await readFile(resolve("apps/mobile/src/providers/auth-provider.tsx"), "utf8");
for (const marker of [
  "startupError",
  "retrySession",
  "sessionInvalid",
  "Preserve the opaque token",
  "email.trim().toLowerCase()"
]) {
  if (!auth.includes(marker)) throw new Error(`Auth stability invariant missing: ${marker}`);
}

const entry = await readFile(resolve("apps/mobile/src/app/index.tsx"), "utf8");
if (!entry.includes("sessionCheckFailed") || !entry.includes("retryConnection")) {
  throw new Error("Startup connection retry UI is missing");
}

for (const file of [
  "apps/mobile/src/app/(auth)/login.tsx",
  "apps/mobile/src/app/(auth)/register.tsx",
  "apps/mobile/src/app/(auth)/recovery.tsx",
  "apps/mobile/src/app/(auth)/reset-password.tsx"
]) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.includes("networkError") || !content.includes("serverError")) {
    throw new Error(`Precise auth connection errors missing: ${file}`);
  }
}

const attempts = await readFile(resolve("apps/api/src/modules/attempts/routes.ts"), "utf8");
if (!attempts.includes("const finalAnswers = Array.isArray(request.body.answers)")
  || !attempts.includes("client_revision = EXCLUDED.client_revision")) {
  throw new Error("Final submission answer persistence is missing");
}

const exam = await readFile(resolve("apps/mobile/src/app/exam/[attemptId].tsx"), "utf8");
if (!exam.includes("answers: current?.answers ?? []")) {
  throw new Error("Mobile submit must include the final local answer snapshot");
}

const migration = await readFile(resolve("packages/database/scripts/migrate.mjs"), "utf8");
for (const marker of [
  'url.searchParams.set("sslmode", "verify-full")',
  "assertCompatibleDatabaseTargets",
  "Authentication schema is ready"
]) {
  if (!migration.includes(marker)) throw new Error(`Migration stability invariant missing: ${marker}`);
}

const database = await readFile(resolve("packages/database/src/index.ts"), "utf8");
for (const marker of [
  "assertDatabaseReady",
  "databaseErrorSummary",
  "npm run db:migrate"
]) {
  if (!database.includes(marker)) throw new Error(`Database readiness invariant missing: ${marker}`);
}

const databaseVerifier = await readFile(resolve("packages/database/scripts/verify-runtime.mjs"), "utf8");
for (const marker of [
  "DATABASE_URL and DIRECT_DATABASE_URL point to different database targets",
  "kankor_migrations",
  "Runtime database and authentication schema are ready",
  "Grade 10 curriculum books are present",
  "Grade 11 curriculum books are present",
  "securePgConnectionString",
  'url.searchParams.set("sslmode", "verify-full")'
]) {
  if (!databaseVerifier.includes(marker)) throw new Error(`Runtime database verifier invariant missing: ${marker}`);
}

const lanLauncher = await readFile(resolve("scripts/dev-lan.mjs"), "utf8");
for (const marker of [
  'runRequired(["run", "verify:dev-network"]',
  'runRequired(["run", "db:verify"]',
  'waitForApi(`http://127.0.0.1:${apiPort}/health`',
  '"start:lan"',
  "process.env.npm_execpath",
  "process.execPath",
  "spawnNpm"
]) {
  if (!lanLauncher.includes(marker)) throw new Error(`LAN development launcher invariant missing: ${marker}`);
}

if (lanLauncher.includes('"npm.cmd"')) {
  throw new Error("Windows LAN launcher must not spawn npm.cmd directly");
}

const rootPackage = await readFile(resolve("package.json"), "utf8");
if (!rootPackage.includes('"dev:lan": "node scripts/dev-lan.mjs"')) {
  throw new Error("Integrated LAN development command is missing");
}

const curriculumRoutes = await readFile(resolve("apps/api/src/modules/curriculum/routes.ts"), "utf8");
for (const marker of [
  'Querystring: { gradeId?: string }',
  'selectDistinct({',
  'eq(schema.books.gradeId, gradeId)',
  'eq(schema.books.active, true)'
]) {
  if (!curriculumRoutes.includes(marker)) throw new Error(`Grade-aware curriculum API invariant missing: ${marker}`);
}

const practice = await readFile(resolve("apps/mobile/src/app/(tabs)/practice.tsx"), "utf8");
for (const marker of [
  '/subjects?gradeId=',
  'setSubjectId(null)',
  'gradeId ? <ChoiceGroup label={text.subject}'
]) {
  if (!practice.includes(marker)) throw new Error(`Grade-aware Practice invariant missing: ${marker}`);
}

const grade10RemainingMigration = await readFile(resolve("packages/database/drizzle/0015_grade10_remaining_official_books.sql"), "utf8");
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
  '"sourceFilename":"G10-Dr-Tafseer(1).pdf"'
]) {
  if (!grade10RemainingMigration.includes(marker)) {
    throw new Error(`Grade 10 remaining-book migration invariant missing: ${marker}`);
  }
}

const grade10RemainingVerifier = await readFile(resolve("scripts/verify-grade10-remaining-books.mjs"), "utf8");
for (const marker of [
  "Expected 21 Grade 10 Geology curriculum topics",
  "Expected 47 Grade 10 Islamic Education lessons",
  "Expected 24 Grade 10 Tafseer lessons"
]) {
  if (!grade10RemainingVerifier.includes(marker)) {
    throw new Error(`Grade 10 remaining-book verifier invariant missing: ${marker}`);
  }
}

const grade11RemainingMigration = await readFile(resolve("packages/database/drizzle/0013_grade11_remaining_official_books.sql"), "utf8");
for (const marker of [
  'SELECT c."id",v.code,v.title_ps,v.title_ps',
  '"sourceFilename":"G11-Dr-Islamic_Study_Hanafi(1).pdf"',
  '"sourceFilename":"G11-Dr-Math(2).pdf"',
  '"sourceFilename":"G11-Dr-Pashto(1).pdf"',
  '"sourceFilename":"G11-Dr-Physic(1).pdf"'
]) {
  if (!grade11RemainingMigration.includes(marker)) throw new Error(`Grade 11 remaining-book migration invariant missing: ${marker}`);
}
if (grade11RemainingMigration.includes('SELECT c."id",v.code,NULL,v.title_ps')) {
  throw new Error("Grade 11 Pashto topics must not violate required title_fa");
}

const grade11TafseerMigration = await readFile(resolve("packages/database/drizzle/0014_grade11_tafseer.sql"), "utf8");
if (!grade11TafseerMigration.includes('"sourceFilename":"G11-Dr-Tafseer(1).pdf"')) {
  throw new Error("Grade 11 Tafseer source metadata is not aligned with the uploaded textbook");
}

const server = await readFile(resolve("apps/api/src/server.ts"), "utf8");
for (const marker of [
  '"Kankor API listening"',
  "Invalid API_PORT",
  "await assertDatabaseReady()",
  "databaseCause"
]) {
  if (!server.includes(marker)) throw new Error(`API startup diagnostic missing: ${marker}`);
}

console.log("Stability audit verified: root mobile env loading, Windows-safe integrated LAN startup, quiet/reliable API networking, precise auth errors, session preservation, grade-aware Practice curriculum loading, complete Grade 10 and Grade 11 textbook migrations, final-answer submission persistence, secure runtime database verification, and fail-fast API database readiness are present.");
