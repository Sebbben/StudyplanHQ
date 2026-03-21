import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";
import { getCatalogCourses } from "@/lib/courses/catalog";

export default async function PlannerPage() {
  const [courses, session] = await Promise.all([getCatalogCourses(), getSession()]);

  return (
    <div>
      <PlannerWorkspace courses={courses} authenticated={Boolean(session)} />
    </div>
  );
}
