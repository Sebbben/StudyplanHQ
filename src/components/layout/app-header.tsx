import Link from "next/link";

import { getSession } from "@/lib/auth/session";

export async function AppHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-stone-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            StudyPlanHQ
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-stone-600 md:flex">
            <Link href="/courses" className="transition hover:text-stone-950">
              Courses
            </Link>
            <Link href="/planner" className="transition hover:text-stone-950">
              Planner
            </Link>
            <Link href="/my-plans" className="transition hover:text-stone-950">
              My Plans
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden text-sm text-stone-600 sm:inline">{session.name ?? session.email ?? session.sub}</span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
