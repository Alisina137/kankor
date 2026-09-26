import type { ConfigContext, ExpoConfig } from "expo/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../../.env"), override: true });

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "KankorPrep Afghanistan",
  slug: config.slug ?? "kankorprep-afghanistan",
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:4000"
  }
});
