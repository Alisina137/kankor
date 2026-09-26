import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { Tunnel } = require("cloudflared");

const repositoryRoot = resolve(".");
const npmExecPath = process.env.npm_execpath;
const metroPort = 8081;

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
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
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

function waitForTunnelUrl(tunnel, label, timeoutMs = 30_000) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    const timer = setTimeout(() => {
      finish(rejectPromise, new Error(`${label} tunnel did not return a public URL within ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    tunnel.once("url", (url) => {
      if (typeof url !== "string" || !url.startsWith("https://")) {
        finish(rejectPromise, new Error(`${label} tunnel returned an invalid URL: ${String(url)}`));
        return;
      }

      finish(resolvePromise, url.replace(/\/$/, ""));
    });

    tunnel.once("error", (error) => {
      finish(rejectPromise, error instanceof Error ? error : new Error(String(error)));
    });

    tunnel.once("exit", (code, signal) => {
      if (!settled) {
        finish(
          rejectPromise,
          new Error(`${label} tunnel exited before becoming ready (code ${code ?? "unknown"}, signal ${signal ?? "none"}).`)
        );
      }
    });
  });
}

async function waitForPublicApi(url) {
  const deadline = Date.now() + 30_000;
  const healthUrl = `${url}/health`;

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
let apiTunnel;
let metroTunnel;
let shuttingDown = false;

function stopTunnel(tunnel) {
  if (!tunnel) return;
  try {
    tunnel.stop();
  } catch {
    // Tunnel may already be stopped.
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(mobileProcess);
  stopProcess(apiProcess);
  stopTunnel(metroTunnel);
  stopTunnel(apiTunnel);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

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
      shutdown(1);
    });

    await waitForLocalApi(localHealthUrl, apiProcess);
  }

  console.log("\n→ Creating Cloudflare Quick Tunnel for Kankor API");
  apiTunnel = Tunnel.quick(`http://127.0.0.1:${apiPort}`);
  const apiTunnelUrl = await waitForTunnelUrl(apiTunnel, "API");
  await waitForPublicApi(apiTunnelUrl);

  console.log("\n→ Creating Cloudflare Quick Tunnel for Expo/Metro");
  metroTunnel = Tunnel.quick(`http://127.0.0.1:${metroPort}`);
  const metroTunnelUrl = await waitForTunnelUrl(metroTunnel, "Expo/Metro");

  console.log("\n✓ IP-independent development is ready");
  console.log(`  API:   ${apiTunnelUrl}`);
  console.log(`  Metro: ${metroTunnelUrl}`);
  console.log("  No fixed LAN IP is used.");
  console.log("  The phone and laptop only need internet access.");

  const expoArgs = process.argv.slice(2);
  const mobileEnv = {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiTunnelUrl,
    EXPO_PUBLIC_API_URLS: "",
    EXPO_PACKAGER_PROXY_URL: metroTunnelUrl
  };

  console.log("\n→ Starting Expo through the public Metro proxy URL");
  mobileProcess = spawnNpm([
    "--workspace",
    "@kankor/mobile",
    "run",
    "start",
    "--",
    "--port",
    String(metroPort),
    ...expoArgs
  ], mobileEnv);

  mobileProcess.on("error", (error) => {
    console.error("Failed to start Expo:", error);
    shutdown(1);
  });

  mobileProcess.on("exit", (code) => {
    shutdown(code ?? 0);
  });

  if (apiProcess) {
    apiProcess.on("exit", (code) => {
      if (!shuttingDown && mobileProcess?.exitCode === null) {
        console.error(
          `\nKankor API stopped unexpectedly (exit code ${code ?? "unknown"}). Stopping Expo.`
        );
        shutdown(code ?? 1);
      }
    });
  }
} catch (error) {
  console.error("\nIP-independent development startup failed.");
  console.error(error instanceof Error ? error.message : error);
  stopProcess(apiProcess);
  stopTunnel(metroTunnel);
  stopTunnel(apiTunnel);
  process.exit(1);
}
