import { notFound, redirect } from "next/navigation";

import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";
import { getCatalogCourses } from "@/lib/courses/catalog";
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

  const [courses, plan] = await Promise.all([getCatalogCourses(), getPlanById(planId, session.userId)]);

  if (!plan) {
    notFound();
  }

  return (
    <PlannerWorkspace
      courses={courses}
      authenticated
      planId={plan.id}
      initialDraft={{
        name: plan.name,
        startTerm: plan.startTerm,
        semesters: plan.semesters,
      }}
    />
  );
}
