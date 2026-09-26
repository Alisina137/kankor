import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(".");
const mobileRoot = resolve(repositoryRoot, "apps", "mobile");
const require = createRequire(import.meta.url);

let easRunPath;
try {
  const easPackagePath = require.resolve("eas-cli/package.json");
  easRunPath = resolve(dirname(easPackagePath), "bin", "run");
} catch {
  throw new Error('Local eas-cli is not installed. Run "npm install" first.');
}

function runEas(args) {
  const result = spawnSync(process.execPath, [easRunPath, ...args], {
    cwd: mobileRoot,
    stdio: "inherit",
    shell: false
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`EAS command failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127
  );
}

function validatePublicHttpsApi(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("API URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Preview API URL must use HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    ["localhost", "::1"].includes(hostname) ||
    hostname.endsWith(".local") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error(
      "Preview API URL must be publicly reachable; localhost and private/LAN addresses are not allowed."
    );
  }

  return raw.replace(/\/$/, "");
}

const [command, value] = process.argv.slice(2);

if (command === "list") {
  runEas(["env:list", "preview", "--scope", "project", "--format", "long"]);
  process.exit(0);
}

if (command === "set-api") {
  if (!value) {
    throw new Error(
      'Usage: npm run eas:preview:env:set-api -- https://your-stable-api.example.com'
    );
  }

  const apiUrl = validatePublicHttpsApi(value);

  console.log(`→ Setting preview EXPO_PUBLIC_API_URL to ${apiUrl}`);
  runEas([
    "env:set",
    "preview",
    "--name",
    "EXPO_PUBLIC_API_URL",
    "--value",
    apiUrl,
    "--visibility",
    "plaintext",
    "--scope",
    "project",
    "--non-interactive"
  ]);

  console.log("→ Ensuring preview build mode is enabled");
  runEas([
    "env:set",
    "preview",
    "--name",
    "KANKOR_PREVIEW_BUILD",
    "--value",
    "true",
    "--visibility",
    "plaintext",
    "--scope",
    "project",
    "--non-interactive"
  ]);

  console.log("✓ Preview EAS environment configured");
  console.log("  EXPO_PUBLIC_API_URL=" + apiUrl);
  console.log("  KANKOR_PREVIEW_BUILD=true");
  process.exit(0);
}

throw new Error(
  'Unknown command. Use "list" or "set-api".'
);
