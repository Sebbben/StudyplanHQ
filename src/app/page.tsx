import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="note-panel-strong note-pin relative overflow-hidden rounded-[2.2rem] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="note-kicker">Semester Notebook</p>
            <h1 className="max-w-4xl font-[family-name:var(--font-display-serif)] text-4xl leading-tight text-stone-950 sm:text-5xl lg:text-6xl">
              A planning board for students who want to sketch, compare, and revise future semesters in one place.
            </h1>
            <p className="max-w-3xl text-lg leading-8 note-copy">
              This direction treats the app like a personal study notebook. It keeps the workflow public and useful, but
              makes the overall tone feel more like arranging course notes and future term ideas than operating a
              polished company product.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white hover:opacity-92"
              >
                Open planner
              </Link>
              <Link
                href="/courses"
                className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-5 py-3 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
              >
                Browse course notes
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.6rem] border border-[rgba(47,61,107,0.14)] bg-[var(--note)] p-5 shadow-[0_12px_26px_rgba(100,82,41,0.1)]">
              <p className="note-kicker">Pinned Reminder</p>
              <p className="mt-3 text-base leading-7 text-stone-800">
                Draft first. Decide later. The useful part of the app starts before login so students can think with it,
                not register with it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Course ideas", "Pull possible courses into view before you start committing them to a term."],
                ["Term load", "See semester credits while the plan is still flexible enough to change."],
                ["Dependency notes", "Catch prerequisite ordering problems early enough to rearrange the draft."],
                ["Saved versions", "Keep drafts after login without turning the whole app into an account wall."],
              ].map(([title, text], index) => (
                <div
                  key={title}
                  className={`rounded-[1.45rem] border p-4 shadow-[0_10px_22px_rgba(100,82,41,0.08)] ${
                    index % 2 === 0
                      ? "border-[rgba(47,61,107,0.12)] bg-[var(--paper)]"
                      : "border-[rgba(168,108,83,0.14)] bg-[var(--note-rose)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="note-panel rounded-[1.9rem] p-6 sm:p-7">
          <p className="note-kicker">How Students Use It</p>
          <h2 className="mt-3 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
            Think in semesters, jot down options, and adjust before choices harden into commitments
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Search", "Start from the catalog and gather the realistic course options."],
              ["02", "Arrange", "Place them across terms while the semester totals stay visible."],
              ["03", "Review", "Use the warnings as study-planning notes rather than hard rejection messages."],
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-[1.4rem] border border-[var(--line)] bg-[rgba(255,253,247,0.8)] p-4">
                <p className="font-mono text-xs font-semibold tracking-[0.18em] text-[var(--ink)]">{step}</p>
                <h3 className="mt-3 text-lg font-semibold text-stone-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 note-copy">{text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="note-panel rounded-[1.9rem] p-6 sm:p-7">
          <p className="note-kicker">Design Intent</p>
          <h2 className="mt-3 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
            More campus notebook than formal dashboard
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-7 note-copy">
            <p>The warmer palette and paper textures make the app feel owned by the student, not by a company brand team.</p>
            <p>Cards behave more like pinned notes and planning fragments than polished enterprise modules.</p>
            <p>The utility stays intact, but the emotional tone is more personal and study-oriented.</p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Reference", "Course information feels like a set of notes you can keep nearby while deciding what fits."],
          ["Planner", "Semester boards feel like movable study materials rather than abstract product widgets."],
          ["Saved Drafts", "Authentication supports persistence without taking over the whole experience."],
        ].map(([title, text], index) => (
          <article
            key={title}
            className={`rounded-[1.8rem] border p-6 shadow-[0_12px_26px_rgba(100,82,41,0.08)] ${
              index === 1 ? "border-[rgba(47,61,107,0.14)] bg-[var(--note-green)]" : "note-panel"
            }`}
          >
            <p className="note-kicker">{title}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
