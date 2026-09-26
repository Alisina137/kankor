import type { NextConfig } from "next";

function assertProductionAdminConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configured) {
    throw new Error("NEXT_PUBLIC_API_URL is required for a production admin build.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use https for a production admin build.");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("NEXT_PUBLIC_API_URL must not point to localhost for a production admin build.");
  }
}

assertProductionAdminConfig();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" }
        ]
      }
    ];
  }
};

export default nextConfig;
