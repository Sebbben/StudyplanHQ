import { PlannerWorkspace } from "@/components/planner/planner-workspace";
import { getSession } from "@/lib/auth/session";

export default async function PlannerPage() {
  const session = await getSession();

  return (
    <div>
      <PlannerWorkspace
        initialCourses={[]}
        authenticated={Boolean(session)}
        initialDraft={undefined}
      />
    </div>
  );
}
