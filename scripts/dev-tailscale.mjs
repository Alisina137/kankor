import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(".");
const npmExecPath = process.env.npm_execpath;
const metroPort = 8081;

if (!npmExecPath) {
  throw new Error(
    'npm_execpath is unavailable. Start this launcher with "npm run dev:tailscale -- --clear".'
  );
}

function npmArgs(args) {
  return [npmExecPath, ...args];
}

function runRequired(args, label) {
  console.log("\n→ " + label);
  const result = spawnSync(process.execPath, npmArgs(args), {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(label + " failed with exit code " + (result.status ?? "unknown"));
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

function findTailscaleExecutable() {
  const where = spawnSync("where.exe", ["tailscale.exe"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  if (where.status === 0 && where.stdout?.trim()) {
    const candidate = where.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find(Boolean);
    if (candidate) return candidate;
  }

  const candidates = [
    "C:\\Program Files\\Tailscale\\tailscale.exe",
    "C:\\Program Files (x86)\\Tailscale\\tailscale.exe"
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function tailscaleIpv4(executable) {
  const result = spawnSync(executable, ["ip", "-4"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || "unknown error";
    throw new Error("Tailscale is installed but not connected: " + details);
  }

  const address = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value));

  if (!address) {
    throw new Error("Tailscale did not return an IPv4 address. Sign in and connect Tailscale first.");
  }

  return address;
}

function spawnNpm(args, env = process.env) {
  return spawn(process.execPath, npmArgs(args), {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false,
    env
  });
}

async function probeKankorApi(url, timeoutMs = 3000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
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
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    if (apiProcess?.exitCode !== null && apiProcess?.exitCode !== undefined) {
      throw new Error("API exited before becoming ready (exit code " + apiProcess.exitCode + ").");
    }

    const probe = await probeKankorApi(url);
    if (probe.kind === "kankor") {
      console.log("✓ API ready at " + url);
      return;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error("API did not become ready at " + url + " within 20 seconds.");
}

async function assertTailscaleApiReachable(address, port) {
  const healthUrl = "http://" + address + ":" + port + "/health";
  const probe = await probeKankorApi(healthUrl, 5000);

  if (probe.kind !== "kankor") {
    throw new Error(
      "Kankor API is healthy on localhost but not reachable through Tailscale at " +
      healthUrl +
      ". Check Windows Firewall/Tailscale connectivity, then retry."
    );
  }

  console.log("✓ Kankor API reachable through Tailscale at http://" + address + ":" + port);
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
  if (process.platform !== "win32") {
    throw new Error("dev:tailscale currently targets the project's Windows development environment.");
  }

  const tailscale = findTailscaleExecutable();
  if (!tailscale) {
    throw new Error(
      "Tailscale is not installed. Install Tailscale on this laptop, sign in, then run dev:tailscale again."
    );
  }

  const tailscaleIp = tailscaleIpv4(tailscale);
  console.log("✓ Tailscale IPv4: " + tailscaleIp);

  runRequired(["run", "db:verify"], "Checking runtime database");

  const envText = await readFile(resolve(repositoryRoot, ".env"), "utf8");
  const apiPort = Number(parseEnvValue(envText, "API_PORT") || "4000");

  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("Invalid API_PORT in .env: " + apiPort);
  }

  const localHealthUrl = "http://127.0.0.1:" + apiPort + "/health";
  const existingApi = await probeKankorApi(localHealthUrl);

  if (existingApi.kind === "kankor") {
    console.log("\n✓ Existing Kankor API detected at " + localHealthUrl + "; reusing it.");
  } else {
    if (existingApi.kind === "occupied") {
      throw new Error(
        "Port " + apiPort + " is already in use by a non-Kankor service. Stop that process or change API_PORT."
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

  await assertTailscaleApiReachable(tailscaleIp, apiPort);

  const apiUrl = "http://" + tailscaleIp + ":" + apiPort;
  const metroUrl = "http://" + tailscaleIp + ":" + metroPort;
  const expoArgs = process.argv.slice(2);
  const mobileEnv = {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiUrl,
    EXPO_PUBLIC_API_URLS: "",
    EXPO_PACKAGER_PROXY_URL: metroUrl
  };

  console.log("\n✓ Tailscale development is ready");
  console.log("  API:   " + apiUrl);
  console.log("  Metro: " + metroUrl);
  console.log("  Local Wi-Fi/DHCP IP changes do not matter.");
  console.log("  Keep Tailscale connected on both the laptop and phone.");

  console.log("\n→ Starting Expo over the Tailscale address");
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
    stopProcess(apiProcess);
    process.exit(code ?? 0);
  });

  if (apiProcess) {
    apiProcess.on("exit", (code) => {
      if (!shuttingDown && mobileProcess?.exitCode === null) {
        console.error(
          "\nKankor API stopped unexpectedly (exit code " + (code ?? "unknown") + "). Stopping Expo."
        );
        stopProcess(mobileProcess);
        process.exit(code ?? 1);
      }
    });
  }
} catch (error) {
  console.error("\nTailscale development startup failed.");
  console.error(error instanceof Error ? error.message : error);
  stopProcess(apiProcess);
  process.exit(1);
}
