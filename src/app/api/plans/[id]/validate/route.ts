import { NextResponse } from "next/server";

import { getCatalogCoursesByCodes } from "@/lib/courses/catalog";
import { getSession } from "@/lib/auth/session";
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

  await assertSameOrigin();

  const planId = Number((await params).id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const plan = await getPlanById(planId, session.userId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const courseCodes = Array.from(
    new Set(plan.semesters.flatMap((semester) => semester.courses.map((course) => course.code))),
  );
  const courses = await getCatalogCoursesByCodes(courseCodes);
  const issues = validateDraft(
    {
      name: plan.name,
      startTerm: plan.startTerm,
      semesters: plan.semesters,
    },
    courses,
  );

  return NextResponse.json({ issues });
}
