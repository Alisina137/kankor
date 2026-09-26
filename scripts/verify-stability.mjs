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
if (!migration.includes('url.searchParams.set("sslmode", "verify-full")')) {
  throw new Error("Migration SSL verification mode is not pinned");
}

const server = await readFile(resolve("apps/api/src/server.ts"), "utf8");
if (!server.includes('"Kankor API listening"') || !server.includes("Invalid API_PORT")) {
  throw new Error("API startup diagnostics are incomplete");
}

console.log("Stability audit verified: root mobile env loading, quiet/reliable API networking, precise auth errors, session preservation, final-answer submission persistence, secure migration SSL semantics, and API startup diagnostics are present.");
