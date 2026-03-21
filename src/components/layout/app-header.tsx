import Link from "next/link";

import { getSession } from "@/lib/auth/session";

export async function AppHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-[var(--line)] bg-[rgba(247,240,223,0.82)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="note-kicker">Study Plan Notes</p>
            <Link href="/" className="mt-2 block font-[family-name:var(--font-display-serif)] text-4xl leading-none text-stone-950">
              StudyPlanHQ
            </Link>
            <p className="mt-2 max-w-2xl text-sm note-copy">
              Course planning support that feels closer to a study notebook than a product funnel.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/planner"
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-92"
                >
                  New plan
                </Link>
                <span className="hidden rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-3 py-2 text-sm note-copy sm:inline">
                  {session.name ?? session.email ?? session.sub}
                </span>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-2 text-sm font-medium text-stone-700 hover:border-[var(--ink)] hover:text-stone-950"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/planner"
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-2 text-sm font-medium text-stone-700 hover:border-[var(--ink)] hover:text-stone-950"
                >
                  New plan
                </Link>
                <a
                  href="/api/auth/login"
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-92"
                >
                  Log in
                </a>
              </>
            )}
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/courses"
            className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-4 py-2 text-stone-700 hover:border-[var(--ink)] hover:text-stone-950"
          >
              Courses
          </Link>
          <Link
            href="/planner"
            className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-4 py-2 text-stone-700 hover:border-[var(--ink)] hover:text-stone-950"
          >
              Planner
          </Link>
          <Link
            href="/my-plans"
            className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.82)] px-4 py-2 text-stone-700 hover:border-[var(--ink)] hover:text-stone-950"
          >
              My Plans
          </Link>
          <span className="note-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
            semester notebook
          </span>
        </nav>
      </div>
    </header>
  );
}
