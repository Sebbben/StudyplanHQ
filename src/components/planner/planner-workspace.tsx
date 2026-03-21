"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { PlannerCourse, PlannerDraft, PlannerIssue } from "@/lib/planner/types";
import { validateDraft } from "@/lib/planner/validation";
import { buildSequentialTerms, termLabel } from "@/lib/utils/term";

const LOCAL_STORAGE_KEY = "studyplanhq-planner-draft";

type PlannerWorkspaceProps = {
  courses: PlannerCourse[];
  initialDraft?: PlannerDraft;
  authenticated: boolean;
};

function createEmptyDraft(): PlannerDraft {
  const startTerm = "2026-autumn";
  return {
    name: "My UiO plan",
    startTerm,
    semesters: buildSequentialTerms(startTerm).map((termKey) => ({
      termKey,
      courses: [],
    })),
  };
}

export function PlannerWorkspace({ courses, initialDraft, authenticated }: PlannerWorkspaceProps) {
  const [draft, setDraft] = useState<PlannerDraft>(() => {
    if (initialDraft) {
      return initialDraft;
    }

    if (typeof window === "undefined") {
      return createEmptyDraft();
    }

    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return createEmptyDraft();
    }

    try {
      return JSON.parse(stored) as PlannerDraft;
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      return createEmptyDraft();
    }
  });
  const [query, setQuery] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialDraft) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [draft, initialDraft]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return courses;
    }

    return courses.filter((course) => {
      const haystack = `${course.code} ${course.title} ${course.department} ${course.tags.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [courses, query]);

  const issues = useMemo<PlannerIssue[]>(() => validateDraft(draft, courses), [draft, courses]);

  function addCourse(termKey: string, courseCode: string) {
    setDraft((current) => ({
      ...current,
      semesters: current.semesters.map((semester) =>
        semester.termKey === termKey
          ? {
              ...semester,
              courses: [...semester.courses, { code: courseCode }],
            }
          : semester,
      ),
    }));
  }

  function removeCourse(termKey: string, courseCode: string) {
    setDraft((current) => ({
      ...current,
      semesters: current.semesters.map((semester) =>
        semester.termKey === termKey
          ? (() => {
              const courseIndex = semester.courses.findIndex((item) => item.code === courseCode);

              if (courseIndex === -1) {
                return semester;
              }

              return {
                ...semester,
                courses: semester.courses.filter((_, index) => index !== courseIndex),
              };
            })()
          : semester,
      ),
    }));
  }

  function getCourse(code: string) {
    return courses.find((course) => course.code === code);
  }

  function semesterCredits(termKey: string) {
    const semester = draft.semesters.find((item) => item.termKey === termKey);
    return (
      semester?.courses.reduce((total, item) => {
        const course = getCourse(item.code);
        return total + (course?.credits ?? 0);
      }, 0) ?? 0
    );
  }

  async function savePlan() {
    setSaveMessage(null);

    if (!authenticated) {
      setSaveMessage("Log in before saving this plan.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const payload = await response.json().catch(() => null);
      setSaveMessage(response.ok ? "Plan saved." : payload?.error ?? "Failed to save the plan.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      <aside className="note-panel note-pin relative rounded-[1.9rem] p-5">
        <div className="space-y-4">
          <div>
            <p className="note-kicker">Course Search</p>
            <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
              Build the term draft from course notes
            </h2>
            <p className="mt-2 text-sm leading-6 note-copy">
              Search once, then place likely courses into the first semesters while the plan is still flexible.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, title, topic..."
            className="w-full rounded-[1.1rem] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
          />
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {filteredCourses.map((course) => (
              <div
                key={course.code}
                className="rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,253,247,0.76)] p-4 shadow-[0_8px_20px_rgba(100,82,41,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                    <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                  </div>
                  <span className="text-xs font-medium note-copy">{course.credits} cr</span>
                </div>
                <p className="mt-3 text-xs leading-5 note-copy">{course.department}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.semesters.slice(0, 4).map((semester) => (
                    <button
                      key={`${course.code}-${semester.termKey}`}
                      type="button"
                      onClick={() => addCourse(semester.termKey, course.code)}
                      className="rounded-full border border-[var(--line)] bg-[var(--note)] px-3 py-1 text-xs font-medium text-stone-800 hover:border-[var(--ink)] hover:text-stone-950"
                    >
                      Add to {termLabel(semester.termKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="note-panel-strong note-pin relative rounded-[1.9rem] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="note-kicker">Planner</p>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 w-full bg-transparent font-[family-name:var(--font-display-serif)] text-4xl tracking-tight text-stone-950 outline-none"
              />
              <p className="mt-2 text-sm note-copy">
                Six terms, visible load, and room to rearrange ideas before the plan needs to become final.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={savePlan}
                disabled={isPending}
                className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Save plan"}
              </button>
              {saveMessage ? <p className="text-sm note-copy">{saveMessage}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {draft.semesters.map((semester) => (
            <article
              key={semester.termKey}
              className="rounded-[1.8rem] border border-[var(--line)] bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_12px_24px_rgba(100,82,41,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                    {semester.termKey}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
                    {termLabel(semester.termKey)}
                  </h3>
                </div>
                <span className="note-chip rounded-full px-3 py-1 text-sm font-medium">
                  {semesterCredits(semester.termKey)} cr
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {semester.courses.length > 0 ? (
                  semester.courses.map((item, index) => {
                    const course = getCourse(item.code);
                    if (!course) {
                      return null;
                    }

                    return (
                      <div
                        key={`${item.code}-${index}`}
                        className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--note)] p-4 shadow-[0_8px_18px_rgba(100,82,41,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                            <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCourse(semester.termKey, course.code)}
                            className="text-sm note-copy hover:text-stone-950"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-2 text-xs note-copy">{course.credits} credits · {course.offeredTerms.join(", ")}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-4 py-8 text-center text-sm note-copy">
                    No courses planned yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="note-panel note-pin relative rounded-[1.9rem] p-5">
        <p className="note-kicker">Plan Review</p>
        <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">Warnings and guidance</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--note-green)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] note-copy">Courses</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">
              {draft.semesters.reduce((sum, semester) => sum + semester.courses.length, 0)}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--note-rose)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] note-copy">Warnings</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{issues.length}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {issues.length > 0 ? (
            issues.map((issue, index) => (
              <div key={`${issue.type}-${index}`} className="rounded-[1.2rem] border border-[rgba(122,95,46,0.18)] bg-[var(--warning-soft)] p-4">
                <p className="text-sm font-semibold text-stone-950">{issue.message}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-[var(--ink)]">
                  {issue.type}
                  {issue.termKey ? ` · ${termLabel(issue.termKey)}` : ""}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-[rgba(77,109,58,0.18)] bg-[var(--success-soft)] p-4 text-sm text-stone-950">
              The current draft has no detected prerequisite, offering, duplicate, or load warnings.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
