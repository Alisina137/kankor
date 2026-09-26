import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(".");
const npmExecPath = process.env.npm_execpath;
const metroPort = 8081;

const CLOUDFLARED_VERSION = "2026.9.3";
const CLOUDFLARED_WINDOWS_X64_SHA256 =
  "f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2";
const CLOUDFLARED_WINDOWS_X64_URL =
  `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-windows-amd64.exe`;

const devCacheDir = join(repositoryRoot, ".cache", "kankor-dev");
const cloudflaredPath = join(
  devCacheDir,
  `cloudflared-${CLOUDFLARED_VERSION}-windows-amd64.exe`
);
const cloudflaredPartialPath = `${cloudflaredPath}.part`;

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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileSha256(path) {
  return sha256(await readFile(path));
}

async function verifiedSystemCloudflared() {
  const where = spawnSync("where.exe", ["cloudflared.exe"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  if (where.status !== 0 || !where.stdout?.trim()) return null;

  for (const candidate of where.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    try {
      const digest = await fileSha256(candidate);
      if (digest === CLOUDFLARED_WINDOWS_X64_SHA256) {
        console.log(`✓ Using SHA-256 verified system cloudflared: ${candidate}`);
        return candidate;
      }
    } catch {
      // Ignore unreadable PATH candidates and fall back to the managed copy.
    }
  }

  return null;
}

async function partialFileSize() {
  try {
    return (await stat(cloudflaredPartialPath)).size;
  } catch {
    return 0;
  }
}

function formatMiB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

async function downloadOfficialCloudflared() {
  const existingPartial = await partialFileSize();
  const headers = {};

  if (existingPartial > 0) {
    headers.Range = `bytes=${existingPartial}-`;
    console.log(`→ Resuming cloudflared download from ${formatMiB(existingPartial)}`);
  }

  const response = await fetch(CLOUDFLARED_WINDOWS_X64_URL, {
    redirect: "follow",
    headers,
    signal: AbortSignal.timeout(15 * 60_000)
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download cloudflared: HTTP ${response.status} ${response.statusText}`
    );
  }

  const resumed = existingPartial > 0 && response.status === 206;
  const startingBytes = resumed ? existingPartial : 0;
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  const totalBytes = contentLength > 0 ? startingBytes + contentLength : 0;
  const file = await open(cloudflaredPartialPath, resumed ? "a" : "w");
  const reader = response.body.getReader();

  let downloaded = startingBytes;
  let nextProgress = downloaded + 5 * 1024 * 1024;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      await file.write(value);
      downloaded += value.byteLength;

      if (downloaded >= nextProgress) {
        const total = totalBytes > 0 ? ` / ${formatMiB(totalBytes)}` : "";
        console.log(`  Downloaded ${formatMiB(downloaded)}${total}`);
        nextProgress = downloaded + 5 * 1024 * 1024;
      }
    }
  } finally {
    await file.close();
  }

  if (downloaded < 2) {
    throw new Error("Downloaded cloudflared asset is empty.");
  }

  const binary = await readFile(cloudflaredPartialPath);
  if (binary[0] !== 0x4d || binary[1] !== 0x5a) {
    await unlink(cloudflaredPartialPath).catch(() => undefined);
    throw new Error("Downloaded cloudflared asset is not a valid Windows PE executable.");
  }

  const digest = sha256(binary);
  if (digest !== CLOUDFLARED_WINDOWS_X64_SHA256) {
    await unlink(cloudflaredPartialPath).catch(() => undefined);
    throw new Error(
      `cloudflared SHA-256 mismatch. Expected ${CLOUDFLARED_WINDOWS_X64_SHA256}, received ${digest}.`
    );
  }

  await unlink(cloudflaredPath).catch(() => undefined);
  await rename(cloudflaredPartialPath, cloudflaredPath);
  console.log("✓ Official cloudflared binary downloaded and SHA-256 verified");
  return cloudflaredPath;
}

async function ensureOfficialCloudflared() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error(
      `dev:anywhere currently manages cloudflared automatically on Windows x64 only. Detected ${process.platform}/${process.arch}.`
    );
  }

  await mkdir(devCacheDir, { recursive: true });

  try {
    await stat(cloudflaredPath);
    const existingDigest = await fileSha256(cloudflaredPath);
    if (existingDigest === CLOUDFLARED_WINDOWS_X64_SHA256) {
      console.log(
        `✓ Verified cached Cloudflare binary ${CLOUDFLARED_VERSION} (SHA-256)`
      );
      return cloudflaredPath;
    }

    console.warn("Cached cloudflared binary failed checksum verification; replacing it.");
    await unlink(cloudflaredPath).catch(() => undefined);
  } catch {
    // Managed binary is not cached yet.
  }

  const systemBinary = await verifiedSystemCloudflared();
  if (systemBinary) return systemBinary;

  console.log(
    `\n→ Downloading official Cloudflare cloudflared ${CLOUDFLARED_VERSION} for Windows x64`
  );
  console.log("  Slow connections are supported; interrupted downloads resume on the next run.");

  return downloadOfficialCloudflared();
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

function startCloudflareQuickTunnel(binaryPath, localUrl, label) {
  const child = spawn(binaryPath, [
    "tunnel",
    "--no-autoupdate",
    "--protocol",
    "http2",
    "--url",
    localUrl
  ], {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true
  });

  let recentOutput = "";
  let settled = false;
  let quickTunnelCreated = false;

  const urlPromise = new Promise((resolvePromise, rejectPromise) => {
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };

    const inspectOutput = (chunk) => {
      const output = chunk.toString();
      recentOutput = (recentOutput + output).slice(-6000);

      if (process.env.KANKOR_TUNNEL_DEBUG === "true") {
        process.stderr.write(output);
      }

      if (/quick Tunnel has been created!/i.test(recentOutput)) {
        quickTunnelCreated = true;
      }

      if (!quickTunnelCreated) return;

      const matches = [...recentOutput.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi)];
      const generated = matches
        .map((match) => ({ url: match[0], host: match[1].toLowerCase() }))
        .find(({ host }) => !["api", "login"].includes(host));

      if (generated) {
        finish(resolvePromise, generated.url.replace(/\/$/, ""));
      }
    };

    child.stdout?.on("data", inspectOutput);
    child.stderr?.on("data", inspectOutput);

    child.once("error", (error) => {
      finish(
        rejectPromise,
        new Error(
          `${label} tunnel process failed to start: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    });

    child.once("exit", (code, signal) => {
      if (!settled) {
        const details = recentOutput.trim()
          ? `\ncloudflared output:\n${recentOutput.trim()}`
          : "";
        finish(
          rejectPromise,
          new Error(
            `${label} tunnel exited before returning a public URL (code ${code ?? "unknown"}, signal ${signal ?? "none"}).${details}`
          )
        );
      }
    });

    const timer = setTimeout(() => {
      const details = recentOutput.trim()
        ? `\ncloudflared output:\n${recentOutput.trim()}`
        : "";
      finish(
        rejectPromise,
        new Error(
          `${label} tunnel did not return a public URL within 35 seconds.${details}`
        )
      );
    }, 35_000);
  });

  return { child, urlPromise };
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
let apiTunnelProcess;
let metroTunnelProcess;
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(mobileProcess);
  stopProcess(apiProcess);
  stopProcess(metroTunnelProcess);
  stopProcess(apiTunnelProcess);
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

  const binaryPath = await ensureOfficialCloudflared();

  console.log("\n→ Creating Cloudflare Quick Tunnel for Kankor API");
  const apiTunnel = startCloudflareQuickTunnel(
    binaryPath,
    `http://127.0.0.1:${apiPort}`,
    "API"
  );
  apiTunnelProcess = apiTunnel.child;
  const apiTunnelUrl = await apiTunnel.urlPromise;
  await waitForPublicApi(apiTunnelUrl);

  console.log("\n→ Creating Cloudflare Quick Tunnel for Expo/Metro");
  const metroTunnel = startCloudflareQuickTunnel(
    binaryPath,
    `http://127.0.0.1:${metroPort}`,
    "Expo/Metro"
  );
  metroTunnelProcess = metroTunnel.child;
  const metroTunnelUrl = await metroTunnel.urlPromise;

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
  stopProcess(metroTunnelProcess);
  stopProcess(apiTunnelProcess);
  process.exit(1);
}
