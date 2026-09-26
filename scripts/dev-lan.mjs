import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(".");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runRequired(args, label) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(npmCommand, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function parseEnvValue(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n#]+)\\s*$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

async function waitForApi(url, apiProcess) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (apiProcess.exitCode !== null) {
      throw new Error(`API exited before becoming ready (exit code ${apiProcess.exitCode}).`);
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) {
        console.log(`✓ API ready at ${url}`);
        return;
      }
    } catch {
      // API is still starting.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error(`API did not become ready at ${url} within 20 seconds.`);
}

function stopProcess(child) {
  if (!child?.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false
    });
  } else {
    child.kill("SIGTERM");
  }
}

let apiProcess;
let mobileProcess;
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(mobileProcess);
  stopProcess(apiProcess);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

try {
  runRequired(["run", "verify:dev-network"], "Checking LAN API configuration");
  runRequired(["run", "db:verify"], "Checking runtime database");

  const envText = await readFile(resolve(repositoryRoot, ".env"), "utf8");
  const apiPort = Number(parseEnvValue(envText, "API_PORT") || "4000");

  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT in .env: ${apiPort}`);
  }

  console.log("\n→ Starting Kankor API");
  apiProcess = spawn(npmCommand, ["run", "dev:api"], {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false
  });

  apiProcess.on("error", (error) => {
    console.error("Failed to start API:", error);
    shutdown(1);
  });

  await waitForApi(`http://127.0.0.1:${apiPort}/health`, apiProcess);

  const expoArgs = process.argv.slice(2);
  console.log("\n→ Starting Expo LAN development server");
  mobileProcess = spawn(
    npmCommand,
    ["--workspace", "@kankor/mobile", "run", "start:lan", "--", ...expoArgs],
    {
      cwd: repositoryRoot,
      stdio: "inherit",
      shell: false
    }
  );

  mobileProcess.on("error", (error) => {
    console.error("Failed to start Expo:", error);
    shutdown(1);
  });

  mobileProcess.on("exit", (code) => {
    stopProcess(apiProcess);
    process.exit(code ?? 0);
  });

  apiProcess.on("exit", (code) => {
    if (!shuttingDown && mobileProcess?.exitCode === null) {
      console.error(`\nKankor API stopped unexpectedly (exit code ${code ?? "unknown"}). Stopping Expo.`);
      stopProcess(mobileProcess);
      process.exit(code ?? 1);
    }
  });
} catch (error) {
  console.error("\nLAN development startup failed.");
  console.error(error instanceof Error ? error.message : error);
  stopProcess(apiProcess);
  process.exit(1);
}
