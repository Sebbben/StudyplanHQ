import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const appUrlOrigin = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;

function expandLocalOrigins(origin: string) {
  const url = new URL(origin);
  const port = url.port ? `:${url.port}` : "";

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return [origin];
  }

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]") {
    return [
      `${url.protocol}//localhost${port}`,
      `${url.protocol}//127.0.0.1${port}`,
      `${url.protocol}//[::1]${port}`,
    ];
  }

  return [origin];
}

function buildSourceList(...sources: string[]) {
  return Array.from(new Set(sources.filter(Boolean))).join(" ");
}

const allowedOrigins = expandLocalOrigins(appUrlOrigin);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${buildSourceList("'self'", ...allowedOrigins)}`,
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action ${buildSourceList("'self'", ...allowedOrigins)}`,
  !isDevelopment ? "upgrade-insecure-requests" : "",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isDevelopment
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
