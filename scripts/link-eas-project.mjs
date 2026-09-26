import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(".");
const mobileRoot = resolve(repositoryRoot, "apps", "mobile");
const appJsonPath = resolve(mobileRoot, "app.json");
const require = createRequire(import.meta.url);

let easRunPath;
try {
  const easPackagePath = require.resolve("eas-cli/package.json");
  easRunPath = resolve(dirname(easPackagePath), "bin", "run");
} catch {
  throw new Error(
    'Local eas-cli is not installed. Run "npm install" in C:\\projects\\kankor, then retry "npm run eas:link".'
  );
}

const args = [
  easRunPath,
  "project:init",
  "--account",
  "alisina137",
  "--json",
  "--non-interactive",
  "--no-icon"
];

console.log("→ Creating/linking the Kankor EAS project under @alisina137");

const result = spawnSync(process.execPath, args, {
  cwd: mobileRoot,
  encoding: "utf8",
  stdio: ["inherit", "pipe", "inherit"],
  shell: false
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`EAS project initialization failed with exit code ${result.status ?? "unknown"}.`);
}

let linked;
try {
  linked = JSON.parse(result.stdout.trim());
} catch {
  throw new Error("EAS CLI did not return valid JSON project information.");
}

const projectId = linked?.projectId;
if (
  typeof projectId !== "string" ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
) {
  throw new Error("EAS CLI did not return a valid project ID.");
}

const app = JSON.parse(await readFile(appJsonPath, "utf8"));
app.expo ??= {};
app.expo.owner = linked.owner || "alisina137";
app.expo.runtimeVersion = { policy: "appVersion" };
app.expo.extra ??= {};
app.expo.extra.eas ??= {};
app.expo.extra.eas.projectId = projectId;
app.expo.updates = {
  ...(app.expo.updates ?? {}),
  enabled: true,
  url: `https://u.expo.dev/${projectId}`,
  checkAutomatically: "ON_LOAD",
  fallbackToCacheTimeout: 0
};

await writeFile(appJsonPath, JSON.stringify(app, null, 2) + "\n", "utf8");

console.log("✓ Kankor EAS project linked");
console.log(`  Owner: @${linked.owner || "alisina137"}`);
console.log(`  Slug: ${linked.slug || "kankorprep-afghanistan"}`);
console.log(`  Project ID: ${projectId}`);
console.log(`  Update URL: https://u.expo.dev/${projectId}`);
if (linked.dashboardUrl) console.log(`  Dashboard: ${linked.dashboardUrl}`);
console.log("");
console.log("Next: configure the stable preview API URL in the EAS preview environment, then run npm run verify:eas-update.");
