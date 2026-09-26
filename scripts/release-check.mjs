import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  throw new Error('Run release checks through npm: "npm run release:check".');
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

function run(args, label, env) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(process.execPath, [npmExecPath, ...args], {
    cwd: resolve("."),
    stdio: "inherit",
    shell: false,
    env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

const production = process.argv.includes("--production");
const envArg = process.argv.find((item) => item.startsWith("--env="));
const envPath = envArg?.slice("--env=".length) || ".env.production";

let childEnv = {
  ...process.env,
  CI: "1"
};

let lockfilePresent = true;
try {
  await readFile(resolve("package-lock.json"), "utf8");
} catch {
  lockfilePresent = false;
}

if (!lockfilePresent) {
  if (production) {
    throw new Error(
      "package-lock.json is required for a production release. Run npm install, review the lockfile, and commit it."
    );
  }
  console.warn(
    "\n⚠ package-lock.json is not present. Generate and commit it before the production release check."
  );
}

if (production) {
  const productionText = await readFile(resolve(envPath), "utf8").catch(() => {
    throw new Error(
      `Production environment file ${envPath} was not found. Copy .env.production.example and configure real values.`
    );
  });
  childEnv = { ...childEnv, ...parseEnv(productionText) };
  run(
    ["run", "verify:production-env", "--", `--env=${envPath}`],
    "Validating production environment",
    childEnv
  );
} else {
  childEnv = {
    ...childEnv,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "https://api.release-check.invalid",
    EXPO_PUBLIC_API_URL:
      process.env.EXPO_PUBLIC_API_URL || "https://api.release-check.invalid"
  };
}

for (const script of [
  "verify:foundation",
  "verify:phase2",
  "verify:phase3",
  "verify:phase4",
  "verify:phase5",
  "verify:phase6",
  "verify:phase7",
  "verify:phase8",
  "verify:phase9",
  "verify:phase10",
  "verify:home-profile",
  "verify:rtl",
  "verify:stability"
]) {
  run(["run", script], script, childEnv);
}

run(["run", "typecheck"], "Type-checking all workspaces", childEnv);
run(
  ["--workspace", "@kankor/mobile", "run", "check:expo"],
  "Checking Expo SDK dependency compatibility",
  childEnv
);
run(["run", "build:api"], "Building API", childEnv);
run(["run", "build:admin"], "Building admin", childEnv);

if (production) {
  run(["run", "db:verify"], "Verifying production database", childEnv);
}

console.log(
  production
    ? "\n✓ Production release checks passed. Complete the manual smoke/store checklist in docs/RELEASE.md before submission."
    : "\n✓ Source release checks passed. Run npm run release:check:production after configuring .env.production."
);
