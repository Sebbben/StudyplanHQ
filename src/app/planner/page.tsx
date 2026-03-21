import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";
import { getCatalogCourses } from "@/lib/courses/catalog";

export default async function PlannerPage() {
  const [courses, session] = await Promise.all([getCatalogCourses(), getSession()]);

  return (
    <div className="space-y-8">
      <section className="note-panel-strong note-pin relative rounded-[2rem] p-8">
        <p className="note-kicker">Planner Workspace</p>
        <h1 className="mt-3 font-[family-name:var(--font-display-serif)] text-4xl tracking-tight text-stone-950">
          Map out semesters before registration pressure hits
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 note-copy">
          Add courses to future semesters, see your workload, and review warnings immediately. Save drafts after logging in through Keycloak.
        </p>
      </section>
      <PlannerWorkspace courses={courses} authenticated={Boolean(session)} />
    </div>
  );
}
