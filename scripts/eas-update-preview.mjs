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

const userArgs = process.argv.slice(2);
const result = spawnSync(
  process.execPath,
  [
    easRunPath,
    "update",
    "--channel",
    "preview",
    "--environment",
    "preview",
    ...userArgs
  ],
  {
    cwd: mobileRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      KANKOR_PREVIEW_BUILD: "true"
    }
  }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
