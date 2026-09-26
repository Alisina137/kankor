import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const ngrok = require("@expo/ngrok");

const repositoryRoot = resolve(".");
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error(
    'npm_execpath is unavailable. Start this launcher with "npm run dev:anywhere -- --clear".'
  );
}

function npmArgs(args) {
  return [npmExecPath, ...args];
}

function runRequired(args, label) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(process.execPath, npmArgs(args), {
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
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^[ \t]*([A-Z0-9_]+)[ \t]*=[ \t]*(.*)$/i);
    if (!match || match[1] !== key) continue;

    const raw = match[2].split("#", 1)[0].trim();
    return raw.replace(/^["']|["']$/g, "");
  }

  return "";
}

function spawnNpm(args, env = process.env) {
  return spawn(process.execPath, npmArgs(args), {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false,
    env
  });
}

async function probeKankorApi(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2_000),
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    const body = await response.json().catch(() => null);

    if (response.ok && body?.service === "kankor-api") {
      return { kind: "kankor", body };
    }

    return { kind: "occupied", status: response.status };
  } catch {
    return { kind: "free" };
  }
}

async function waitForLocalApi(url, apiProcess) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (apiProcess?.exitCode !== null && apiProcess?.exitCode !== undefined) {
      throw new Error(`API exited before becoming ready (exit code ${apiProcess.exitCode}).`);
    }

    const probe = await probeKankorApi(url);
    if (probe.kind === "kankor") {
      console.log(`✓ API ready at ${url}`);
      return;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error(`API did not become ready at ${url} within 20 seconds.`);
}

async function waitForTunnel(url) {
  const deadline = Date.now() + 20_000;
  const healthUrl = `${url.replace(/\/$/, "")}/health`;

  while (Date.now() < deadline) {
    const probe = await probeKankorApi(healthUrl);
    if (probe.kind === "kankor") {
      console.log(`✓ Public Kankor API tunnel ready at ${url}`);
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 700));
  }

  throw new Error(`Public API tunnel did not become ready at ${url}.`);
}

function stopProcess(child) {
  if (!child?.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false
    });
  } else {
    child.kill("SIGTERM");
  }
}

let apiProcess;
let mobileProcess;
let apiTunnelUrl = "";
let shuttingDown = false;

async function stopTunnel() {
  if (!apiTunnelUrl) return;
  try {
    await ngrok.disconnect(apiTunnelUrl);
  } catch {
    // Tunnel may already be gone.
  }
  try {
    await ngrok.kill();
  } catch {
    // ngrok may already be stopped by Expo/process shutdown.
  }
  apiTunnelUrl = "";
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(mobileProcess);
  stopProcess(apiProcess);
  await stopTunnel();
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

try {
  runRequired(["run", "db:verify"], "Checking runtime database");

  const envText = await readFile(resolve(repositoryRoot, ".env"), "utf8");
  const apiPort = Number(parseEnvValue(envText, "API_PORT") || "4000");

  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT in .env: ${apiPort}`);
  }

  const localHealthUrl = `http://127.0.0.1:${apiPort}/health`;
  const existingApi = await probeKankorApi(localHealthUrl);

  if (existingApi.kind === "kankor") {
    console.log(`\n✓ Existing Kankor API detected at ${localHealthUrl}; reusing it.`);
  } else {
    if (existingApi.kind === "occupied") {
      throw new Error(
        `Port ${apiPort} is already in use by a non-Kankor service. Stop that process or change API_PORT.`
      );
    }

    console.log("\n→ Starting Kankor API");
    apiProcess = spawnNpm(["run", "dev:api"]);

    apiProcess.on("error", (error) => {
      console.error("Failed to start API:", error);
      void shutdown(1);
    });

    await waitForLocalApi(localHealthUrl, apiProcess);
  }

  console.log("\n→ Creating public HTTPS tunnel for Kankor API");
  apiTunnelUrl = await ngrok.connect({
    proto: "http",
    addr: apiPort
  });

  if (!apiTunnelUrl || !apiTunnelUrl.startsWith("https://")) {
    throw new Error(`Expected an HTTPS API tunnel URL, received: ${apiTunnelUrl || "(empty)"}`);
  }

  await waitForTunnel(apiTunnelUrl);

  console.log("\n✓ IP-independent development is ready");
  console.log(`  API tunnel: ${apiTunnelUrl}`);
  console.log("  Expo will also run in tunnel mode.");
  console.log("  The phone does not need to share the laptop's Wi-Fi or LAN IP.");

  const expoArgs = process.argv.slice(2);
  const mobileEnv = {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiTunnelUrl,
    EXPO_PUBLIC_API_URLS: ""
  };

  console.log("\n→ Starting Expo tunnel");
  mobileProcess = spawnNpm([
    "--workspace",
    "@kankor/mobile",
    "run",
    "start:tunnel",
    "--",
    ...expoArgs
  ], mobileEnv);

  mobileProcess.on("error", (error) => {
    console.error("Failed to start Expo tunnel:", error);
    void shutdown(1);
  });

  mobileProcess.on("exit", (code) => {
    void shutdown(code ?? 0);
  });

  if (apiProcess) {
    apiProcess.on("exit", (code) => {
      if (!shuttingDown && mobileProcess?.exitCode === null) {
        console.error(
          `\nKankor API stopped unexpectedly (exit code ${code ?? "unknown"}). Stopping Expo.`
        );
        void shutdown(code ?? 1);
      }
    });
  }
} catch (error) {
  console.error("\nIP-independent development startup failed.");
  console.error(error instanceof Error ? error.message : error);
  stopProcess(apiProcess);
  await stopTunnel();
  process.exit(1);
}
