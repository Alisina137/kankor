const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

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
