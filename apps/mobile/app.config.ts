import type { ConfigContext, ExpoConfig } from "expo/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../.env") });

function mobileBuildMode() {
  const production =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.KANKOR_RELEASE_BUILD === "true";
  const preview =
    process.env.EAS_BUILD_PROFILE === "preview" ||
    process.env.KANKOR_PREVIEW_BUILD === "true";

  return { preview, production, remote: preview || production };
}

function apiUrlForBuild() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const mode = mobileBuildMode();

  if (!mode.remote) return configured || "http://localhost:4000";

  const buildLabel = mode.production ? "production" : "preview";

  if (!configured) {
    throw new Error(`EXPO_PUBLIC_API_URL is required for a ${buildLabel} mobile build.`);
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error(`EXPO_PUBLIC_API_URL must use https for a ${buildLabel} mobile build.`);
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error(`EXPO_PUBLIC_API_URL must not point to localhost for a ${buildLabel} mobile build.`);
  }

  return configured.replace(/\/$/, "");
}

function apiFallbackUrls() {
  const mode = mobileBuildMode();
  if (mode.remote) return [];

  const raw = process.env.EXPO_PUBLIC_API_URLS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const mode = mobileBuildMode();

  return {
    ...config,
    name: config.name ?? "KankorPrep Afghanistan",
    slug: config.slug ?? "kankorprep-afghanistan",
    updates: {
      ...config.updates,
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: mode.preview ? 5000 : (config.updates?.fallbackToCacheTimeout ?? 0)
    },
    extra: {
      ...config.extra,
      apiUrl: apiUrlForBuild(),
      apiUrls: apiFallbackUrls()
    }
  };
};
