import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { isIP } from "node:net";

const envText = await readFile(".env", "utf8").catch(() => "");
if (!envText) {
  console.error("Repository-root .env was not found.");
  process.exit(1);
}

const match = envText.match(/^\s*EXPO_PUBLIC_API_URL\s*=\s*([^\r\n#]+)\s*$/m);
if (!match) {
  console.error("EXPO_PUBLIC_API_URL is missing from the repository-root .env.");
  process.exit(1);
}

const value = match[1].trim().replace(/^["']|["']$/g, "");
let url;
try {
  url = new URL(value);
} catch {
  console.error(`EXPO_PUBLIC_API_URL is not a valid URL: ${value}`);
  process.exit(1);
}

const addresses = [];
for (const entries of Object.values(networkInterfaces())) {
  for (const item of entries ?? []) {
    if (item.family === "IPv4" && !item.internal) addresses.push(item.address);
  }
}

console.log(`Configured mobile API: ${url.origin}`);
console.log(`Active laptop IPv4 addresses: ${addresses.join(", ") || "(none)"}`);

if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
  console.error("A physical phone cannot use localhost for the laptop API. Set EXPO_PUBLIC_API_URL to the laptop Wi-Fi IPv4 address.");
  process.exit(1);
}

if (isIP(url.hostname) === 4 && !addresses.includes(url.hostname)) {
  console.error(`Configured API host ${url.hostname} is not an active laptop IPv4 address. Update EXPO_PUBLIC_API_URL before testing on a physical phone.`);
  process.exit(1);
}

console.log("✓ Development mobile API host matches an active laptop network address.");
