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
  'Cache-Control'
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
  "TRUST_PROXY must be either true or false"
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

const mobileConfig = await text("apps/mobile/app.config.ts");
for (const marker of [
  'process.env.EAS_BUILD_PROFILE === "production"',
  'process.env.KANKOR_RELEASE_BUILD === "true"',
  "EXPO_PUBLIC_API_URL is required for a production mobile build",
  "must use https for a production mobile build",
  "must not point to localhost"
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
if (mobileApp.expo?.ios?.config?.usesNonExemptEncryption !== false) {
  throw new Error("iOS SecureStore export-compliance configuration is missing");
}

const mobilePackage = JSON.parse(await text("apps/mobile/package.json"));
for (const [name, version] of Object.entries({
  expo: "~57.0.25",
  "expo-constants": "~57.0.19",
  "expo-router": "~57.0.23",
  "expo-secure-store": "~57.0.4",
  "expo-status-bar": "~57.0.1",
  "react-native": "0.86.3",
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
if (eas.build?.production?.android?.buildType !== "app-bundle") {
  throw new Error("EAS production profile must produce an Android App Bundle");
}
if (eas.build?.production?.env?.KANKOR_RELEASE_BUILD !== "true") {
  throw new Error("EAS production profile must enforce release mobile configuration");
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

const productionExample = await text(".env.production.example");
for (const marker of [
  "NODE_ENV=production",
  "sslmode=verify-full",
  "EXPO_PUBLIC_API_URL=https://",
  "NEXT_PUBLIC_API_URL=https://",
  "ADMIN_WEB_ORIGIN=https://",
  "AUTH_EXPOSE_RECOVERY_TOKEN=false",
  "BILLING_WEBHOOK_SECRET="
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
  "release:check:production"
]) {
  if (!rootPackage.scripts?.[script]) throw new Error(`Root release script missing: ${script}`);
}

await text("docs/RELEASE.md");

console.log("Phase 10 structure verified: production guards, secure headers, release build metadata, EAS profiles, environment validation, dependency gates, release checks, and release runbook are present.");
