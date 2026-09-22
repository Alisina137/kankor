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

function resolveApiUrl() {
  const configured = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

  if (Platform.OS === "web") return configured;

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured);
  if (!isLocalhost) return configured;

  const expoHost = expoDevelopmentHost();
  return expoHost ? `http://${expoHost}:4000` : configured;
}

export const API_URL = resolveApiUrl();

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
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  } catch {
    throw new ApiError("network_error", 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(typeof body.error === "string" ? body.error : "request_failed", response.status);
  }

  return body as T;
}
