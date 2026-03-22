import { getSession } from "@/lib/auth/session";
import { noStoreJson, RouteError, toErrorResponse } from "@/lib/http/response";
import { createPlan, listPlansForUser } from "@/lib/plans/service";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { checkRateLimitForRequest } from "@/lib/security/rate-limit";
import { assertTrustedMutationRequest } from "@/lib/security/request";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return noStoreJson({ error: "Authentication required." }, { status: 401 });
  }

  const plans = await listPlansForUser(session.userId);
  return noStoreJson({ plans });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return noStoreJson({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimitForRequest(request, {
      key: "plans-write",
      max: 60,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) {
      throw new RouteError("Too many write requests. Try again later.", 429, {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }

    assertTrustedMutationRequest(request);
    const payload = plannerDraftSchema.parse(await request.json());
    const plan = await createPlan(session.userId, payload);

    return noStoreJson({ plan }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Failed to create plan." });
  }
}
