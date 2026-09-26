function normalized(value: string | undefined) {
  return value?.trim() ?? "";
}

function assertHttpsPublicUrl(name: string, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https in production.`);
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    throw new Error(`${name} must not point to localhost in production.`);
  }
}

export function resolveTrustProxy() {
  const raw = normalized(process.env.TRUST_PROXY).toLowerCase();
  if (!raw) return false;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error("TRUST_PROXY must be either true or false.");
}

export function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;

  if (!normalized(process.env.DATABASE_URL)) {
    throw new Error("DATABASE_URL is required in production.");
  }

  if (normalized(process.env.AUTH_EXPOSE_RECOVERY_TOKEN).toLowerCase() === "true") {
    throw new Error("AUTH_EXPOSE_RECOVERY_TOKEN must be false in production.");
  }

  const origins = normalized(process.env.ADMIN_WEB_ORIGIN)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error("ADMIN_WEB_ORIGIN is required in production.");
  }

  for (const origin of origins) {
    if (origin === "*") {
      throw new Error("ADMIN_WEB_ORIGIN must not use a wildcard in production.");
    }
    assertHttpsPublicUrl("ADMIN_WEB_ORIGIN", origin);
  }

  const bootstrapEmails = normalized(process.env.ADMIN_BOOTSTRAP_EMAILS);
  if (bootstrapEmails) {
    throw new Error(
      "ADMIN_BOOTSTRAP_EMAILS must be empty in production after permanent admin roles are assigned."
    );
  }
}
