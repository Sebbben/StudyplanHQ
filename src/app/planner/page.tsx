import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";
import { getCatalogCourses } from "@/lib/courses/catalog";

export default async function PlannerPage() {
  const [courses, session] = await Promise.all([getCatalogCourses(), getSession()]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Planner Workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">Map out semesters before registration pressure hits</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          Add courses to future semesters, see your workload, and review warnings immediately. Save drafts after logging in through Keycloak.
        </p>
      </section>
      <PlannerWorkspace courses={courses} authenticated={Boolean(session)} />
    </div>
  );
}
