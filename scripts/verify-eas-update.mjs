import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function text(path) {
  return readFile(resolve(path), "utf8");
}

const rootPackage = JSON.parse(await text("package.json"));
if (rootPackage.devDependencies?.["eas-cli"] !== "24.8.0") {
  throw new Error("eas-cli 24.8.0 must remain pinned as a root development dependency.");
}

const mobilePackage = JSON.parse(await text("apps/mobile/package.json"));
if (mobilePackage.dependencies?.["expo-updates"] !== "~57.0.23") {
  throw new Error("expo-updates must be installed at ~57.0.23 for Expo SDK 57.");
}

for (const [script, expected] of Object.entries({
  "build:android:preview": "eas build --platform android --profile preview",
  "build:android:production": "eas build --platform android --profile production",
  "eas:update:configure": "eas update:configure",
  "update:preview": "eas update --channel preview",
  "update:production": "eas update --channel production"
})) {
  if (mobilePackage.scripts?.[script] !== expected) {
    throw new Error(`Mobile script ${script} must be: ${expected}`);
  }
}

const app = JSON.parse(await text("apps/mobile/app.json"));
if (app.expo?.name !== "KankorPrep Afghanistan") {
  throw new Error("Existing Expo application name must be preserved.");
}
if (app.expo?.slug !== "kankorprep-afghanistan") {
  throw new Error("Existing Expo slug must be preserved.");
}
if (app.expo?.android?.package !== "com.kankorprep.afghanistan") {
  throw new Error("Existing Android package ID must be preserved.");
}

const projectId = app.expo?.extra?.eas?.projectId;
if (
  typeof projectId !== "string" ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)
) {
  throw new Error(
    'Existing EAS project ID is not present in apps/mobile/app.json. Run "npm run eas:update:configure" while signed into the existing Expo project; do not create a new EAS project.'
  );
}

const expectedUpdateUrl = `https://u.expo.dev/${projectId}`;
const appConfig = await text("apps/mobile/app.config.ts");
const staticUpdateUrl = app.expo?.updates?.url;
const derivesUpdateUrl =
  appConfig.includes('typeof config.extra?.eas?.projectId === "string"') &&
  appConfig.includes('url: `https://u.expo.dev/${projectId}`');

if (staticUpdateUrl !== expectedUpdateUrl && !derivesUpdateUrl) {
  throw new Error(
    `The effective expo.updates.url must point to the existing EAS project: ${expectedUpdateUrl}.`
  );
}

for (const marker of [
  'policy: "fingerprint"',
  'checkAutomatically: "ON_LOAD"',
  'fallbackToCacheTimeout: 0'
]) {
  if (!appConfig.includes(marker)) {
    throw new Error(`EAS Update app-config invariant missing: ${marker}`);
  }
}
if (appConfig.includes("KANKOR_PREVIEW_BUILD") || appConfig.includes("mode.preview")) {
  throw new Error("Preview OTA behavior must not depend on the removed custom preview-build mode.");
}

const fingerprintConfig = await text("apps/mobile/fingerprint.config.js");
for (const marker of [
  'DEFAULT_SOURCE_SKIPS',
  'SourceSkips.ExpoConfigExtraSection'
]) {
  if (!fingerprintConfig.includes(marker)) {
    throw new Error(`Fingerprint config invariant missing: ${marker}`);
  }
}

const eas = JSON.parse(await text("apps/mobile/eas.json"));
if (eas.cli?.version !== "24.8.0") {
  throw new Error("EAS CLI version must remain pinned to 24.8.0.");
}
if (
  eas.build?.preview?.distribution !== "internal" ||
  eas.build?.preview?.channel !== "preview" ||
  eas.build?.preview?.android?.buildType !== "apk"
) {
  throw new Error("Preview profile must be an internal Android APK on the preview update channel.");
}
if (
  eas.build?.production?.channel !== "production" ||
  eas.build?.production?.android?.buildType !== "app-bundle" ||
  eas.build?.production?.autoIncrement !== true
) {
  throw new Error("Production profile must build an auto-incremented Android App Bundle on the production channel.");
}

console.log("✓ EAS Update configuration verified.");
console.log(`✓ Existing EAS project ID: ${projectId}`);
console.log(`✓ Update URL: ${expectedUpdateUrl}`);
console.log("✓ Preview channel: preview");
console.log("✓ Production channel: production");
console.log("✓ Runtime strategy: fingerprint");
console.log("✓ Installed builds use Expo's standard ON_LOAD update behavior.");
