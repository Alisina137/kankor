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

function configuredApiUrl() {
  return (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
}

function apiCandidates() {
  const configured = configuredApiUrl();

  if (Platform.OS === "web") return [configured];

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

  candidates.push(configured);

  // If localhost was configured, also derive the LAN URL from the Expo host.
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);
  if (isLocalhost && expoHost && !expoHostIsTunnel) {
    candidates.push(`http://${expoHost}:4000`);
  }

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
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastNetworkError = error;
      if (__DEV__) {
        console.warn(`Kankor API unreachable at ${baseUrl}`);
      }
      continue;
    }

    if (response.status === 204) return undefined as T;

    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const code =
        typeof body.error === "string"
          ? body.error
          : typeof body.message === "string"
            ? body.message
            : "request_failed";

      throw new ApiError(code, response.status);
    }

    return body as T;
  }

  if (__DEV__ && lastNetworkError) {
    console.warn("All Kankor API candidates failed", API_URLS);
  }

  throw new ApiError("network_error", 0);
}
