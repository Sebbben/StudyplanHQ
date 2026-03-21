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
      <section className="note-panel-strong note-pin relative rounded-[2rem] p-8">
        <p className="note-kicker">Saved Plans</p>
        <h1 className="mt-3 font-[family-name:var(--font-display-serif)] text-4xl tracking-tight text-stone-950">
          Your planning drafts
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 note-copy">
          Saved plans stay private to the authenticated user. Duplicate and richer plan-management actions can extend from this base.
        </p>
        <Link
          href="/planner"
          className="mt-6 inline-flex rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white hover:opacity-92"
        >
          New plan
        </Link>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <article key={plan.id} className="note-panel note-pin relative rounded-[1.8rem] p-6">
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                {termLabel(plan.startTerm)}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">{plan.name}</h2>
              <p className="mt-3 text-sm note-copy">Last updated: {plan.updatedAt.toISOString().slice(0, 10)}</p>
              <Link
                href={`/planner/${plan.id}`}
                className="mt-5 inline-flex rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)] hover:text-stone-950"
              >
                Open plan
              </Link>
            </article>
          ))
        ) : (
          <article className="rounded-[1.8rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] p-8 text-sm note-copy">
            No saved plans yet. Build a plan in the planner and save it after logging in.
          </article>
        )}
      </section>
    </div>
  );
}
