import Constants from "expo-constants";
import { Platform } from "react-native";

function expoDevelopmentHost() {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri;
  if (!hostUri) return null;

  try {
    return new URL(`http://${hostUri}`).hostname;
  } catch {
    return hostUri.split(":")[0] || null;
  }
}

function configuredApiUrls() {
  const extra = Constants.expoConfig?.extra ?? {};
  const primary =
    typeof extra.apiUrl === "string" && extra.apiUrl.trim()
      ? extra.apiUrl.trim()
      : process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

  const extraFallbacks = Array.isArray(extra.apiUrls)
    ? extra.apiUrls.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : [];

  const envFallbacks = (process.env.EXPO_PUBLIC_API_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([primary, ...extraFallbacks, ...envFallbacks].map((value) => value.replace(/\/$/, "")))];
}

function apiCandidates() {
  const configured = configuredApiUrls();

  if (Platform.OS === "web") return configured;

  const candidates: string[] = [];
  const expoHost = expoDevelopmentHost();
  const expoHostIsTunnel = Boolean(
    expoHost && (expoHost.endsWith(".exp.direct") || expoHost.endsWith(".ngrok.io") || expoHost.endsWith(".ngrok-free.app"))
  );

  // On a physical device during Expo development, prefer the host Expo is
  // currently connected to. This survives Wi-Fi/DHCP address changes without
  // requiring the user to keep EXPO_PUBLIC_API_URL in sync manually.
  if (__DEV__ && expoHost && !expoHostIsTunnel && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
    candidates.push(`http://${expoHost}:4000`);
  }

  const physicalDeviceLanHost = Boolean(
    __DEV__ &&
    expoHost &&
    !expoHostIsTunnel &&
    expoHost !== "localhost" &&
    expoHost !== "127.0.0.1"
  );

  const configuredForDevice = physicalDeviceLanHost
    ? configured.filter((value) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value))
    : configured;

  candidates.push(...configuredForDevice);

  return [...new Set(candidates)];
}

export const API_URLS = apiCandidates();
export const API_URL = API_URLS[0];

export class ApiError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  let lastNetworkError: unknown = null;

  for (const baseUrl of API_URLS) {
    let response: Response;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), __DEV__ ? 2500 : 6000);
      try {
        response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastNetworkError = error;
      if (__DEV__) {
        console.info(`Kankor API unreachable at ${baseUrl}`);
      }
      continue;
    }

    if (response.status === 204) return undefined as T;

    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      let code =
        typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : "request_failed";

      if (response.status === 429) code = "rate_limited";
      else if (response.status >= 500) code = "server_error";

      throw new ApiError(code, response.status);
    }

    return body as T;
  }

  if (__DEV__ && lastNetworkError) {
    console.info("All Kankor API candidates failed", API_URLS);
  }

  throw new ApiError("network_error", 0);
}
