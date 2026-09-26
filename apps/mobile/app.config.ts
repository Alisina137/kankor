import type { ConfigContext, ExpoConfig } from "expo/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../.env") });

function apiUrlForBuild() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const releaseBuild =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.KANKOR_RELEASE_BUILD === "true";

  if (!releaseBuild) return configured || "http://localhost:4000";

  if (!configured) {
    throw new Error("EXPO_PUBLIC_API_URL is required for a production mobile build.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_URL must use https for a production mobile build.");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("EXPO_PUBLIC_API_URL must not point to localhost for a production mobile build.");
  }

  return configured.replace(/\/$/, "");
}

function apiFallbackUrls() {
  const releaseBuild =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.KANKOR_RELEASE_BUILD === "true";
  if (releaseBuild) return [];

  const raw = process.env.EXPO_PUBLIC_API_URLS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "KankorPrep Afghanistan",
  slug: config.slug ?? "kankorprep-afghanistan",
  extra: {
    ...config.extra,
    apiUrl: apiUrlForBuild(),
    apiUrls: apiFallbackUrls()
  }
});
