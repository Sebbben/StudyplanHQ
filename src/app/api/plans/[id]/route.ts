import { getSession } from "@/lib/auth/session";
import { noStoreJson, RouteError, toErrorResponse } from "@/lib/http/response";
import { deletePlan, getPlanById, updatePlan } from "@/lib/plans/service";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { checkRateLimitForRequest } from "@/lib/security/rate-limit";
import { assertTrustedMutationRequest } from "@/lib/security/request";

type PlanRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: PlanRouteProps) {
  const session = await getSession();

  if (!session) {
    return noStoreJson({ error: "Authentication required." }, { status: 401 });
  }

  const planId = Number((await params).id);
  if (!Number.isInteger(planId)) {
    return noStoreJson({ error: "Invalid plan id." }, { status: 400 });
  }

  const plan = await getPlanById(planId, session.userId);

  if (!plan) {
    return noStoreJson({ error: "Plan not found." }, { status: 404 });
  }

  return noStoreJson({ plan });
}

export async function PATCH(request: Request, { params }: PlanRouteProps) {
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
    const planId = Number((await params).id);
    const payload = plannerDraftSchema.parse(await request.json());

    if (!Number.isInteger(planId)) {
      return noStoreJson({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await updatePlan(planId, session.userId, payload);

    if (!plan) {
      return noStoreJson({ error: "Plan not found." }, { status: 404 });
    }

    return noStoreJson({ plan });
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Failed to update plan." });
  }
}

export async function DELETE(request: Request, { params }: PlanRouteProps) {
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
    const planId = Number((await params).id);

    if (!Number.isInteger(planId)) {
      return noStoreJson({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await deletePlan(planId, session.userId);

    if (!plan) {
      return noStoreJson({ error: "Plan not found." }, { status: 404 });
    }

    return noStoreJson({ ok: true });
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Failed to delete plan." });
  }
}
