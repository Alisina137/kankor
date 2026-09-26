import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";

const envText = await readFile(".env", "utf8").catch(() => "");
if (!envText) {
  console.error("Repository-root .env was not found.");
  process.exit(1);
}

function envValue(key) {
  const match = envText.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n#]*)\\s*$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

const apiHost = envValue("API_HOST") || "0.0.0.0";
const apiPort = Number(envValue("API_PORT") || "4000");
const primary = envValue("EXPO_PUBLIC_API_URL") || "http://localhost:4000";
const fallbacks = envValue("EXPO_PUBLIC_API_URLS")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (apiHost !== "0.0.0.0") {
  console.error(`API_HOST must be 0.0.0.0 for physical-device LAN development. Current value: ${apiHost}`);
  process.exit(1);
}

if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  console.error(`API_PORT is invalid: ${apiPort}`);
  process.exit(1);
}

for (const [label, value] of [
  ["EXPO_PUBLIC_API_URL", primary],
  ...fallbacks.map((value, index) => [`EXPO_PUBLIC_API_URLS[${index}]`, value])
]) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    console.error(`${label} is not a valid HTTP(S) URL: ${value}`);
    process.exit(1);
  }
}

const addresses = [];
for (const entries of Object.values(networkInterfaces())) {
  for (const item of entries ?? []) {
    if (item.family === "IPv4" && !item.internal) addresses.push(item.address);
  }
}

console.log(`API bind: ${apiHost}:${apiPort}`);
console.log(`Configured primary mobile API: ${primary}`);
if (fallbacks.length) console.log(`Configured fallback mobile APIs: ${fallbacks.join(", ")}`);
console.log(`Active laptop IPv4 addresses: ${addresses.join(", ") || "(none)"}`);

if (!addresses.length) {
  console.error("No active non-loopback IPv4 address was found. Connect the laptop to Wi-Fi/Ethernet before using Expo LAN mode.");
  process.exit(1);
}

console.log("✓ LAN development configuration is network-independent.");
console.log("✓ The mobile app will prefer the current Expo host, then try configured fallback URLs.");
