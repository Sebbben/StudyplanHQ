import { getEnv } from "@/lib/env";

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

function getAllowedOrigins(request: Request) {
  const env = getEnv();
  return new Set([
    ...expandLocalOrigins(new URL(env.APP_URL).origin),
    ...expandLocalOrigins(new URL(request.url).origin),
  ]);
}

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    return new URL(origin).origin;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    return new URL(referer).origin;
  }

  return null;
}

function isTrustedFetchSite(value: string | null) {
  return value === null || value === "same-origin" || value === "same-site" || value === "none";
}

export function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function assertSameOrigin(request: Request) {
  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    throw new Error("Missing origin context.");
  }

  if (!getAllowedOrigins(request).has(requestOrigin)) {
    throw new Error("Cross-site request rejected.");
  }
}

export function assertTrustedMutationRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!isTrustedFetchSite(fetchSite)) {
    throw new Error("Cross-site request rejected.");
  }

  assertSameOrigin(request);

  const contentLength = request.headers.get("content-length");
  const contentType = request.headers.get("content-type");
  const hasBody = contentLength !== null && contentLength !== "0";

  if (hasBody && !contentType?.toLowerCase().startsWith("application/json")) {
    throw new Error("Unsupported content type.");
  }
}
