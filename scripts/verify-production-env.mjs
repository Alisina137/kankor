import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function required(env, name) {
  const value = String(env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required for production.`);
  return value;
}

function rejectPlaceholder(name, value) {
  if (
    /REPLACE_|example\.com|USER:PASSWORD|HOST-POOLER|@HOST\//i.test(value)
  ) {
    throw new Error(`${name} still contains a template/placeholder value.`);
  }
}

function publicHttpsUrl(name, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https in production.`);
  }

  const hostname = url.hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(`${name} must not point to localhost in production.`);
  }

  rejectPlaceholder(name, value);
}

function databaseUrl(name, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${name} must use the postgres/postgresql protocol.`);
  }
  if (url.searchParams.get("sslmode") !== "verify-full") {
    throw new Error(`${name} must set sslmode=verify-full.`);
  }

  rejectPlaceholder(name, value);
  return {
    host: url.hostname.replace(/-pooler(?=\.)/, ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, ""))
  };
}

const envPath = resolve(argValue("env", ".env.production"));
let fileText;
try {
  fileText = await readFile(envPath, "utf8");
} catch {
  throw new Error(
    `Production environment file not found at ${envPath}. Copy .env.production.example and configure real values.`
  );
}

const fileEnv = parseEnv(fileText);
const env = { ...fileEnv, ...process.env };

if (required(env, "NODE_ENV") !== "production") {
  throw new Error("NODE_ENV must be production.");
}

const runtimeTarget = databaseUrl("DATABASE_URL", required(env, "DATABASE_URL"));
const directTarget = databaseUrl("DIRECT_DATABASE_URL", required(env, "DIRECT_DATABASE_URL"));
if (
  runtimeTarget.host !== directTarget.host ||
  runtimeTarget.database !== directTarget.database
) {
  throw new Error(
    "DATABASE_URL and DIRECT_DATABASE_URL must target the same Neon branch/database."
  );
}

publicHttpsUrl("EXPO_PUBLIC_API_URL", required(env, "EXPO_PUBLIC_API_URL"));
publicHttpsUrl("NEXT_PUBLIC_API_URL", required(env, "NEXT_PUBLIC_API_URL"));

const origins = required(env, "ADMIN_WEB_ORIGIN")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
for (const origin of origins) {
  if (origin === "*") throw new Error("ADMIN_WEB_ORIGIN must not contain *.");
  publicHttpsUrl("ADMIN_WEB_ORIGIN", origin);
}

if (String(env.AUTH_EXPOSE_RECOVERY_TOKEN ?? "").trim().toLowerCase() !== "false") {
  throw new Error("AUTH_EXPOSE_RECOVERY_TOKEN must be false in production.");
}

if (String(env.ADMIN_BOOTSTRAP_EMAILS ?? "").trim()) {
  throw new Error(
    "ADMIN_BOOTSTRAP_EMAILS must be empty for final production release after permanent roles are assigned."
  );
}

const trustProxy = String(env.TRUST_PROXY ?? "false").trim().toLowerCase();
if (!["true", "false"].includes(trustProxy)) {
  throw new Error("TRUST_PROXY must be true or false.");
}

const billingSecret = required(env, "BILLING_WEBHOOK_SECRET");
rejectPlaceholder("BILLING_WEBHOOK_SECRET", billingSecret);
if (billingSecret.length < 32) {
  throw new Error("BILLING_WEBHOOK_SECRET must be at least 32 characters.");
}

for (const name of [
  "PROFILE_PHOTO_S3_BUCKET",
  "PROFILE_PHOTO_S3_REGION",
  "PROFILE_PHOTO_S3_ACCESS_KEY_ID",
  "PROFILE_PHOTO_S3_SECRET_ACCESS_KEY"
]) {
  const value = required(env, name);
  rejectPlaceholder(name, value);
}

const photoEndpoint = String(env.PROFILE_PHOTO_S3_ENDPOINT ?? "").trim();
if (photoEndpoint) publicHttpsUrl("PROFILE_PHOTO_S3_ENDPOINT", photoEndpoint);

const photoForcePathStyle = String(env.PROFILE_PHOTO_S3_FORCE_PATH_STYLE ?? "false").trim().toLowerCase();
if (!["true", "false"].includes(photoForcePathStyle)) {
  throw new Error("PROFILE_PHOTO_S3_FORCE_PATH_STYLE must be true or false.");
}

console.log("✓ Production environment configuration is release-safe");
console.log(`✓ Database target: ${runtimeTarget.database} @ ${runtimeTarget.host}`);
console.log(`✓ Admin origins: ${origins.length}`);
