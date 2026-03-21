import { NextResponse } from "next/server";

import { getCatalogCoursesByCodes } from "@/lib/courses/catalog";
import { getSession } from "@/lib/auth/session";
import { collectDraftCourseCodes } from "@/lib/planner/draft";
import { getPlanById } from "@/lib/plans/service";
import { validateDraft } from "@/lib/planner/validation";
import { assertSameOrigin } from "@/lib/security/request";

type PlanValidateRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: PlanValidateRouteProps) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await assertSameOrigin();

    const planId = Number((await params).id);
    if (!Number.isInteger(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await getPlanById(planId, session.userId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
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

    return NextResponse.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate the plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
