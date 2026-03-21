import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { listPlansForUser } from "@/lib/plans/service";
import { termLabel } from "@/lib/utils/term";

export default async function MyPlansPage() {
  const session = await getSession();

  if (!session) {
    redirect("/planner");
  }

  const plans = await listPlansForUser(session.userId);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Saved Plans</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">Your planning drafts</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          Saved plans stay private to the authenticated user. Duplicate and richer plan-management actions can extend from this base.
        </p>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <article key={plan.id} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm shadow-stone-950/5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">{termLabel(plan.startTerm)}</p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">{plan.name}</h2>
              <p className="mt-3 text-sm text-stone-600">Last updated: {plan.updatedAt.toISOString().slice(0, 10)}</p>
              <Link
                href="/planner"
                className="mt-5 inline-flex rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
              >
                Open planner
              </Link>
            </article>
          ))
        ) : (
          <article className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50 p-8 text-sm text-stone-600">
            No saved plans yet. Build a plan in the planner and save it after logging in.
          </article>
        )}
      </section>
    </div>
  );
}
