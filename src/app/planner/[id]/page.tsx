import { notFound, redirect } from "next/navigation";

import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";
import { getCatalogCoursesByCodes } from "@/lib/courses/catalog";
import { collectDraftCourseCodes } from "@/lib/planner/draft";
import { getPlanById } from "@/lib/plans/service";

type PlannerPlanPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlannerPlanPage({ params }: PlannerPlanPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/planner");
  }

  const planId = Number((await params).id);
  if (!Number.isInteger(planId)) {
    notFound();
  }

  const plan = await getPlanById(planId, session.userId);

  if (!plan) {
    notFound();
  }

  const courseCodes = collectDraftCourseCodes(plan);
  const courses = await getCatalogCoursesByCodes(courseCodes);

  return (
    <PlannerWorkspace
      initialCourses={courses}
      authenticated
      planId={plan.id}
      initialDraft={{
        name: plan.name,
        startTerm: plan.startTerm,
        completedCourses: plan.completedCourses,
        semesters: plan.semesters,
      }}
    />
  );
}
