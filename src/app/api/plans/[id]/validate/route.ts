import { getCatalogCoursesByCodes } from "@/lib/courses/catalog";
import { getSession } from "@/lib/auth/session";
import { noStoreJson, RouteError, toErrorResponse } from "@/lib/http/response";
import { collectDraftCourseCodes } from "@/lib/planner/draft";
import { getPlanById } from "@/lib/plans/service";
import { validateDraft } from "@/lib/planner/validation";
import { checkRateLimitForRequest } from "@/lib/security/rate-limit";
import { assertTrustedMutationRequest } from "@/lib/security/request";

type PlanValidateRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: PlanValidateRouteProps) {
  const session = await getSession();

  if (!session) {
    return noStoreJson({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const rateLimit = checkRateLimitForRequest(_, {
      key: "plans-validate",
      max: 90,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) {
      throw new RouteError("Too many validation requests. Try again later.", 429, {
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }

    assertTrustedMutationRequest(_);

    const planId = Number((await params).id);
    if (!Number.isInteger(planId)) {
      return noStoreJson({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await getPlanById(planId, session.userId);
    if (!plan) {
      return noStoreJson({ error: "Plan not found." }, { status: 404 });
    }

    const courses = await getCatalogCoursesByCodes(collectDraftCourseCodes(plan));
    const issues = validateDraft(
      {
        name: plan.name,
        startTerm: plan.startTerm,
        completedCourses: plan.completedCourses,
        semesters: plan.semesters,
      },
      courses,
    );

    return noStoreJson({ issues });
  } catch (error) {
    return toErrorResponse(error, { fallbackMessage: "Failed to validate the plan." });
  }
}
