import { createAuthorizationUrl } from "@/lib/auth/oidc";
import { noStoreRedirect, RouteError, toErrorResponse } from "@/lib/http/response";
import { checkRateLimitForRequest } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimitForRequest(request, {
      key: "auth-login",
      max: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) {
      throw new RouteError("Too many login attempts. Try again later.", 429, {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }

    const nextPath = new URL(request.url).searchParams.get("next");
    const authorizationUrl = await createAuthorizationUrl(nextPath);
    return noStoreRedirect(authorizationUrl);
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Failed to start login." });
  }
}
