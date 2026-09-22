import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "apps/mobile/src/app/_layout.tsx",
  "apps/mobile/src/app/(tabs)/_layout.tsx",
  "apps/mobile/src/app/(tabs)/index.tsx",
  "apps/mobile/src/app/(tabs)/practice.tsx",
  "apps/mobile/src/app/(tabs)/exams.tsx",
  "apps/mobile/src/app/(tabs)/progress.tsx",
  "apps/mobile/src/app/(tabs)/profile.tsx",
  "apps/admin/app/page.tsx",
  "apps/api/src/app.ts",
  "packages/config/src/index.ts",
  "packages/database/src/schema.ts",
  "docs/PROJECT-STATE.md",
  ".env.example"
];

for (const file of required) await access(resolve(file));

const config = await readFile(resolve("packages/config/src/index.ts"), "utf8");
for (const marker of ["fa:", "ps:", "en:", 'direction: "rtl"', 'direction: "ltr"']) {
  if (!config.includes(marker)) throw new Error(`Missing localization marker: ${marker}`);
}

const mobile = JSON.parse(await readFile(resolve("apps/mobile/package.json"), "utf8"));
const admin = JSON.parse(await readFile(resolve("apps/admin/package.json"), "utf8"));

if (!mobile.dependencies["expo-router"]) throw new Error("Expo Router dependency missing");
if (!admin.dependencies.next) throw new Error("Next.js dependency missing");

console.log(`Foundation verified: ${required.length} required files, 3 locales, mobile tabs, admin/API/database shells.`);
