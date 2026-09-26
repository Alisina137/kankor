import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function text(path) {
  return readFile(resolve(path), "utf8");
}

const rootPackage = JSON.parse(await text("package.json"));
if (rootPackage.devDependencies?.["eas-cli"] !== "24.8.0") {
  throw new Error("eas-cli 24.8.0 must be installed as a root development dependency.");
}

const mobilePackage = JSON.parse(await text("apps/mobile/package.json"));
if (mobilePackage.dependencies?.["expo-updates"] !== "~57.0.23") {
  throw new Error("expo-updates must be installed at ~57.0.23 for Expo SDK 57.");
}

const app = JSON.parse(await text("apps/mobile/app.json"));
if (app.expo?.runtimeVersion?.policy !== "appVersion") {
  throw new Error('expo.runtimeVersion.policy must be "appVersion".');
}

const projectId = app.expo?.extra?.eas?.projectId;
if (typeof projectId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
  throw new Error(
    'EAS project is not linked yet. Run "npm run eas:link".'
  );
}

const expectedUpdateUrl = `https://u.expo.dev/${projectId}`;
if (app.expo?.updates?.url !== expectedUpdateUrl) {
  throw new Error(
    `expo.updates.url must be ${expectedUpdateUrl}. Run "npm run eas:link" again.`
  );
}

if (app.expo?.updates?.checkAutomatically !== "ON_LOAD") {
  throw new Error('expo.updates.checkAutomatically must be "ON_LOAD".');
}

const eas = JSON.parse(await text("apps/mobile/eas.json"));
for (const [profile, channel, environment] of [
  ["preview", "preview", "preview"],
  ["production", "production", "production"]
]) {
  if (eas.build?.[profile]?.channel !== channel) {
    throw new Error(`EAS ${profile} profile must use channel "${channel}".`);
  }
  if (eas.build?.[profile]?.environment !== environment) {
    throw new Error(`EAS ${profile} profile must use environment "${environment}".`);
  }
}

if (eas.build?.preview?.android?.buildType !== "apk") {
  throw new Error("EAS preview profile must build an Android APK.");
}

const appConfig = await text("apps/mobile/app.config.ts");
for (const marker of [
  'process.env.KANKOR_PREVIEW_BUILD === "true"',
  'fallbackToCacheTimeout: mode.preview ? 5000',
  'EXPO_PUBLIC_API_URL must use https for a',
  'apiUrls: apiFallbackUrls()'
]) {
  if (!appConfig.includes(marker)) {
    throw new Error(`EAS Update app-config invariant missing: ${marker}`);
  }
}

for (const script of ["build:android:preview", "build:android:production"]) {
  const command = mobilePackage.scripts?.[script] ?? "";
  if (!command.startsWith("eas ") || command.includes("npx")) {
    throw new Error(`${script} must use the pinned local EAS CLI.`);
  }
}

if (mobilePackage.scripts?.["update:preview"] !== "node ../../scripts/eas-update-preview.mjs") {
  throw new Error("Preview OTA updates must use the guarded preview launcher.");
}
if (mobilePackage.scripts?.["update:production"] !== "node ../../scripts/eas-update-production.mjs") {
  throw new Error("Production OTA updates must use the guarded production launcher.");
}

const previewUpdateLauncher = await text("scripts/eas-update-preview.mjs");
for (const marker of [
  '"--channel"',
  '"preview"',
  '"--environment"',
  'KANKOR_PREVIEW_BUILD: "true"'
]) {
  if (!previewUpdateLauncher.includes(marker)) {
    throw new Error(`Preview OTA launcher invariant missing: ${marker}`);
  }
}

const productionUpdateLauncher = await text("scripts/eas-update-production.mjs");
for (const marker of [
  '"--channel"',
  '"production"',
  '"--environment"',
  'KANKOR_RELEASE_BUILD: "true"'
]) {
  if (!productionUpdateLauncher.includes(marker)) {
    throw new Error(`Production OTA launcher invariant missing: ${marker}`);
  }
}

for (const script of ["update:preview", "update:production", "eas:link"]) {
  if (!mobilePackage.scripts?.[script]) {
    throw new Error(`Mobile EAS Update command missing: ${script}`);
  }
}

console.log("✓ EAS Update source configuration is complete.");
console.log(`✓ EAS project ID: ${projectId}`);
console.log("✓ Preview APK channel: preview");
console.log("✓ Runtime policy: appVersion");
console.log("✓ Preview updates will use the EAS preview environment.");
