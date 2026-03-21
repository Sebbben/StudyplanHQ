import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid gap-8 rounded-[2.5rem] border border-stone-200/80 bg-white/85 px-8 py-10 shadow-xl shadow-stone-950/5 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-14">
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">UiO Study Planning</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
            Plan future semesters without rebuilding your degree path from scratch every time.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-stone-600">
            Explore UiO courses, sketch semester-by-semester plans, and catch prerequisite or load issues before registration becomes a mess.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/planner"
              className="rounded-full bg-stone-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Start planning
            </Link>
            <Link
              href="/courses"
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
            >
              Explore courses
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {[
            "Search for courses by code, title, or department.",
            "Build semester boards with clear credit totals.",
            "See warnings for missing prerequisites and term mismatches.",
          ].map((item, index) => (
            <div key={item} className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">0{index + 1}</p>
              <p className="mt-3 text-lg font-medium text-stone-900">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm shadow-stone-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Public First</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Plan before you log in</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Browse and draft freely. Sign in with Keycloak only when you want to save plans or compare alternatives.
          </p>
        </article>
        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm shadow-stone-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Plain-Language Checks</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Warnings instead of hidden assumptions</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            The planner flags course ordering, term availability, duplicates, and overloaded semesters without pretending it is a perfect degree auditor.
          </p>
        </article>
        <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm shadow-stone-950/5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Standalone By Design</p>
          <h2 className="mt-3 text-2xl font-semibold text-stone-950">Independent app, shared login</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            This app stays focused on planning while fitting into your wider ecosystem through SSO rather than tight runtime coupling.
          </p>
        </article>
      </section>
    </div>
  );
}
