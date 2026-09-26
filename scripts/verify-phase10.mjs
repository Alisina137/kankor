import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function text(path) {
  return readFile(resolve(path), "utf8");
}

const apiApp = await text("apps/api/src/app.ts");
for (const marker of [
  "phase: 10",
  'status: "release-readiness"',
  "resolveTrustProxy()",
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Cache-Control',
  'app.get("/ready"',
  'status: "not_ready"'
]) {
  if (!apiApp.includes(marker)) throw new Error(`Phase 10 API release invariant missing: ${marker}`);
}

const apiServer = await text("apps/api/src/server.ts");
if (!apiServer.includes("assertProductionConfiguration()")) {
  throw new Error("Production API startup configuration guard is missing");
}

const productionConfig = await text("apps/api/src/common/production-config.ts");
for (const marker of [
  "AUTH_EXPOSE_RECOVERY_TOKEN must be false in production",
  "ADMIN_WEB_ORIGIN is required in production",
  "ADMIN_BOOTSTRAP_EMAILS must be empty in production",
  "TRUST_PROXY must be either true or false",
  "PROFILE_PHOTO_S3_BUCKET",
  "PROFILE_PHOTO_S3_SECRET_ACCESS_KEY",
  "PROFILE_PHOTO_S3_FORCE_PATH_STYLE"
]) {
  if (!productionConfig.includes(marker)) {
    throw new Error(`Production API safety invariant missing: ${marker}`);
  }
}

const authRoutes = await text("apps/api/src/modules/auth/routes.ts");
if (
  !authRoutes.includes('process.env.AUTH_EXPOSE_RECOVERY_TOKEN === "true"') ||
  !authRoutes.includes('process.env.NODE_ENV !== "production"')
) {
  throw new Error("Password recovery token must remain development-only");
}

const billingRoutes = await text("apps/api/src/modules/billing/routes.ts");
for (const marker of [
  'process.env.NODE_ENV === "production"',
  "provider_not_configured",
  "BILLING_WEBHOOK_SECRET",
  "invalid_webhook_signature"
]) {
  if (!billingRoutes.includes(marker)) {
    throw new Error(`Billing release safety invariant missing: ${marker}`);
  }
}

const mobileLayout = await text("apps/mobile/src/app/_layout.tsx");
for (const marker of [
  "ScreenErrorBoundary",
  "unstable_screenErrorBoundary",
  "Your account information has not been deleted",
  "ستاسو د حساب معلومات نه دي حذف شوي"
]) {
  if (!mobileLayout.includes(marker)) {
    throw new Error(`Mobile release error-boundary invariant missing: ${marker}`);
  }
}

const mobileConfig = await text("apps/mobile/app.config.ts");
for (const marker of [
  'process.env.EAS_BUILD_PROFILE === "production"',
  'process.env.KANKOR_RELEASE_BUILD === "true"',
  'process.env.EAS_BUILD_PROFILE === "preview"',
  'process.env.KANKOR_PREVIEW_BUILD === "true"',
  "EXPO_PUBLIC_API_URL is required for a",
  "must use https for a",
  "must not point to localhost for a",
  'fallbackToCacheTimeout: mode.preview ? 5000'
]) {
  if (!mobileConfig.includes(marker)) {
    throw new Error(`Mobile release configuration invariant missing: ${marker}`);
  }
}

const mobileApp = JSON.parse(await text("apps/mobile/app.json"));
if (mobileApp.expo?.version !== "0.4.0") throw new Error("Mobile app version must match the release baseline 0.4.0");
if (!Number.isInteger(mobileApp.expo?.android?.versionCode)) throw new Error("Android versionCode is required");
if (!mobileApp.expo?.ios?.buildNumber) throw new Error("iOS buildNumber is required");
if (!(mobileApp.expo?.plugins ?? []).includes("expo-secure-store")) {
  throw new Error("expo-secure-store config plugin is required for release builds");
}
const imagePickerPlugin = (mobileApp.expo?.plugins ?? []).some((item) =>
  item === "expo-image-picker" || (Array.isArray(item) && item[0] === "expo-image-picker")
);
if (!imagePickerPlugin) {
  throw new Error("expo-image-picker config plugin is required for profile photo selection");
}
if (mobileApp.expo?.ios?.config?.usesNonExemptEncryption !== false) {
  throw new Error("iOS SecureStore export-compliance configuration is missing");
}
if (mobileApp.expo?.web?.bundler !== "metro") {
  throw new Error("Expo Router web builds must use the Metro bundler");
}
if (mobileApp.expo?.runtimeVersion?.policy !== "appVersion") {
  throw new Error('EAS Update runtimeVersion must use the "appVersion" policy');
}
if (mobileApp.expo?.updates?.checkAutomatically !== "ON_LOAD") {
  throw new Error('EAS Update must check for updates on app load');
}

const mobilePackage = JSON.parse(await text("apps/mobile/package.json"));
for (const [name, version] of Object.entries({
  expo: "~57.0.25",
  "expo-constants": "~57.0.19",
  "expo-router": "~57.0.23",
  "expo-secure-store": "~57.0.4",
  "expo-status-bar": "~57.0.1",
  "expo-image-picker": "~57.0.20",
  "expo-updates": "~57.0.23",
  "react-native": "0.86.3",
  "react-dom": "19.2.3",
  "react-native-web": "0.21.1",
  "@expo/metro-runtime": "~57.0.0",
  "react-native-safe-area-context": "~5.7.0",
  "react-native-screens": "~4.26.0"
})) {
  if (mobilePackage.dependencies?.[name] !== version) {
    throw new Error(`Expo SDK 57 dependency mismatch for ${name}: expected ${version}`);
  }
}
if (!mobilePackage.scripts?.["check:expo"]) throw new Error("Expo dependency validation script is missing");

const eas = JSON.parse(await text("apps/mobile/eas.json"));
if (eas.build?.preview?.android?.buildType !== "apk") {
  throw new Error("EAS preview profile must produce an APK");
}
if (eas.build?.preview?.channel !== "preview" || eas.build?.preview?.environment !== "preview") {
  throw new Error("EAS preview profile must use the preview update channel and environment");
}
if (eas.build?.production?.channel !== "production" || eas.build?.production?.environment !== "production") {
  throw new Error("EAS production profile must use the production update channel and environment");
}
if (eas.build?.preview?.env?.KANKOR_PREVIEW_BUILD !== "true") {
  throw new Error("EAS preview profile must enforce preview mobile configuration");
}
if (eas.build?.production?.android?.buildType !== "app-bundle") {
  throw new Error("EAS production profile must produce an Android App Bundle");
}
if (eas.build?.production?.env?.KANKOR_RELEASE_BUILD !== "true") {
  throw new Error("EAS production profile must enforce release mobile configuration");
}

const profilePhotoStorage = await text("apps/api/src/modules/auth/profile-photo-storage.ts");
for (const marker of [
  "PutObjectCommand",
  "GetObjectCommand",
  "HeadObjectCommand",
  "DeleteObjectCommand",
  "getSignedUrl",
  "MAX_PROFILE_PHOTO_BYTES",
  "profilePhotoStorageConfigured"
]) {
  if (!profilePhotoStorage.includes(marker)) {
    throw new Error(`Profile photo storage invariant missing: ${marker}`);
  }
}

const apiPackage = JSON.parse(await text("apps/api/package.json"));
for (const dependency of ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"]) {
  if (!apiPackage.dependencies?.[dependency]) {
    throw new Error(`Profile photo storage dependency missing: ${dependency}`);
  }
}

const profilePhotoMigration = await text("packages/database/drizzle/0016_user_profile_photo.sql");
if (!profilePhotoMigration.includes("profile_photo_key")) {
  throw new Error("Profile photo migration is missing");
}

const adminConfig = await text("apps/admin/next.config.ts");
for (const marker of [
  "NEXT_PUBLIC_API_URL is required for a production admin build",
  "must use https for a production admin build",
  "poweredByHeader: false",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy"
]) {
  if (!adminConfig.includes(marker)) throw new Error(`Admin release invariant missing: ${marker}`);
}

const gitignore = await text(".gitignore");
for (const marker of [".env.production", ".env.*.local", ".eas/", ".cache/", "*.apk", "*.aab"]) {
  if (!gitignore.split(/\r?\n/).includes(marker)) {
    throw new Error(`Release-sensitive ignore rule missing: ${marker}`);
  }
}

const productionExample = await text(".env.production.example");
for (const marker of [
  "NODE_ENV=production",
  "sslmode=verify-full",
  "EXPO_PUBLIC_API_URL=https://",
  "NEXT_PUBLIC_API_URL=https://",
  "ADMIN_WEB_ORIGIN=https://",
  "AUTH_EXPOSE_RECOVERY_TOKEN=false",
  "BILLING_WEBHOOK_SECRET=",
  "PROFILE_PHOTO_S3_BUCKET=",
  "PROFILE_PHOTO_S3_REGION=",
  "PROFILE_PHOTO_S3_ACCESS_KEY_ID=",
  "PROFILE_PHOTO_S3_SECRET_ACCESS_KEY="
]) {
  if (!productionExample.includes(marker)) {
    throw new Error(`Production environment template invariant missing: ${marker}`);
  }
}

const rootPackage = JSON.parse(await text("package.json"));
for (const script of [
  "verify:phase10",
  "verify:production-env",
  "release:check",
  "release:check:production",
  "dev:anywhere",
  "dev:tailscale",
  "verify:eas-update",
  "eas:link",
  "eas:update:configure",
  "update:preview",
  "update:production"
]) {
  if (!rootPackage.scripts?.[script]) throw new Error(`Root release script missing: ${script}`);
}

const anywhereDev = await text("scripts/dev-anywhere.mjs");
for (const marker of [
  'CLOUDFLARED_VERSION = "2026.9.3"',
  'CLOUDFLARED_WINDOWS_X64_SHA256',
  'cloudflared-windows-amd64.exe',
  'ensureOfficialCloudflared',
  'cloudflaredPartialPath',
  'headers.Range',
  '15 * 60_000',
  'Resuming cloudflared download',
  'startCloudflareQuickTunnel',
  'spawn(binaryPath, [',
  '"--protocol",',
  '"http2",',
  'EXPO_PUBLIC_API_URL: apiTunnelUrl',
  'EXPO_PUBLIC_API_URLS: ""',
  'EXPO_PACKAGER_PROXY_URL: metroTunnelUrl',
  'Public Kankor API tunnel ready',
  'quick Tunnel has been created!',
  '!["api", "login"].includes(host)',
  'Cloudflare Quick Tunnel for Expo/Metro'
]) {
  if (!anywhereDev.includes(marker)) throw new Error(`Anywhere-development invariant missing: ${marker}`);
}

const tailscaleDev = await text("scripts/dev-tailscale.mjs");
for (const marker of [
  '["ip", "-4"]',
  'EXPO_PUBLIC_API_URL: apiUrl',
  'EXPO_PUBLIC_API_URLS: ""',
  'EXPO_PACKAGER_PROXY_URL: metroUrl',
  'assertTailscaleApiReachable',
  'Keep Tailscale connected on both the laptop and phone.'
]) {
  if (!tailscaleDev.includes(marker)) {
    throw new Error(`Tailscale-development invariant missing: ${marker}`);
  }
}

const releaseRunbook = await text("docs/RELEASE.md");
for (const marker of [
  "Password recovery delivery",
  "Production payments",
  "package-lock.json",
  "Manual smoke checklist",
  "npm run release:check:production"
]) {
  if (!releaseRunbook.includes(marker)) throw new Error(`Release runbook invariant missing: ${marker}`);
}

console.log("Phase 10 structure verified: production guards, liveness/readiness health, secure headers, mobile error fallback, profile-photo storage/upload configuration, release build metadata, EAS profiles, environment validation, deterministic-dependency gate, release checks, and release runbook are present.");
