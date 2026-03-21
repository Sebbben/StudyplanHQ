"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { PlannerCourse, PlannerDraft, PlannerIssue } from "@/lib/planner/types";
import { validateDraft } from "@/lib/planner/validation";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { buildSequentialTerms, compareTermKeys, shiftTermKey, termLabel } from "@/lib/utils/term";

const LOCAL_STORAGE_KEY = "studyplanhq-planner-draft";
const TERM_COUNT = 6;
const DRAG_MIME_TYPE = "text/plain";

type PlannerWorkspaceProps = {
  courses: PlannerCourse[];
  initialDraft?: PlannerDraft;
  authenticated: boolean;
};

type DragPayload = {
  code: string;
  sourceTermKey: string | null;
};

function createEmptyDraft(): PlannerDraft {
  const startTerm = "2026-autumn";
  return {
    name: "My UiO plan",
    startTerm,
    semesters: buildSequentialTerms(startTerm, TERM_COUNT).map((termKey) => ({
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
      const parsed = plannerDraftSchema.safeParse(JSON.parse(stored));
      if (!parsed.success) {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        return createEmptyDraft();
      }

      return parsed.data;
    } catch {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      return createEmptyDraft();
    }
  });
  const [visibleStartTerm, setVisibleStartTerm] = useState<string>(() => initialDraft?.startTerm ?? draft.startTerm);
  const [query, setQuery] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeDropTermKey, setActiveDropTermKey] = useState<string | null>(null);
  const [draggedCourseCode, setDraggedCourseCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeDropTermKeyRef = useRef<string | null>(null);
  const dragPayloadRef = useRef<DragPayload | null>(null);

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
  const visibleTermKeys = useMemo(() => buildSequentialTerms(visibleStartTerm, TERM_COUNT), [visibleStartTerm]);
  const visibleSemesters = useMemo(() => {
    const semesterMap = new Map(draft.semesters.map((semester) => [semester.termKey, semester]));
    return visibleTermKeys.map((termKey) => ({
      termKey,
      courses: semesterMap.get(termKey)?.courses ?? [],
    }));
  }, [draft.semesters, visibleTermKeys]);

  function sortSemesters(semesters: PlannerDraft["semesters"]) {
    return [...semesters].sort((left, right) => compareTermKeys(left.termKey, right.termKey));
  }

  function updateVisibleStartTerm(startTerm: string) {
    setVisibleStartTerm(startTerm);
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

  function moveCourse(payload: DragPayload, targetTermKey: string) {
    setDraft((current) => {
      const sourceSemester = payload.sourceTermKey
        ? current.semesters.find((semester) => semester.termKey === payload.sourceTermKey)
        : null;
      const alreadyInTarget = current.semesters.some(
        (semester) =>
          semester.termKey === targetTermKey && semester.courses.some((course) => course.code === payload.code),
      );

      if (!payload.sourceTermKey && alreadyInTarget) {
        return current;
      }

      if (payload.sourceTermKey && payload.sourceTermKey !== targetTermKey && alreadyInTarget) {
        return current;
      }

      if (payload.sourceTermKey === targetTermKey) {
        return current;
      }

      const hasTargetSemester = current.semesters.some((semester) => semester.termKey === targetTermKey);
      const semestersWithTarget = hasTargetSemester
        ? current.semesters
        : [...current.semesters, { termKey: targetTermKey, courses: [] }];

      const nextSemesters = semestersWithTarget.map((semester) => {
        let nextCourses = semester.courses;

        if (payload.sourceTermKey && semester.termKey === payload.sourceTermKey) {
          const sourceIndex = semester.courses.findIndex((course) => course.code === payload.code);
          nextCourses =
            sourceIndex === -1 ? semester.courses : semester.courses.filter((_, index) => index !== sourceIndex);
        }

        if (semester.termKey === targetTermKey) {
          const courseFromSource =
            sourceSemester?.courses.find((course) => course.code === payload.code) ?? { code: payload.code };
          const existsAfterRemoval = nextCourses.some((course) => course.code === payload.code);

          if (!existsAfterRemoval) {
            nextCourses = [...nextCourses, courseFromSource];
          }
        }

        return {
          ...semester,
          courses: nextCourses,
        };
      });

      const nonEmptySemesters = nextSemesters.filter((semester) => semester.courses.length > 0);
      const orderedSemesters = sortSemesters(nonEmptySemesters);

      return {
        ...current,
        startTerm: orderedSemesters[0]?.termKey ?? current.startTerm,
        semesters: orderedSemesters,
      };
    });
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

  function handleDragStart(payload: DragPayload) {
    dragPayloadRef.current = payload;
    setDraggedCourseCode(payload.code);
  }

  function handleDragEnd() {
    const finalTargetTermKey = activeDropTermKeyRef.current;
    const finalPayload = dragPayloadRef.current;

    if (finalTargetTermKey && finalPayload) {
      moveCourse(finalPayload, finalTargetTermKey);
    }

    dragPayloadRef.current = null;
    activeDropTermKeyRef.current = null;
    setDraggedCourseCode(null);
    setActiveDropTermKey(null);
  }

  function handleSemesterDragEnter(termKey: string) {
    activeDropTermKeyRef.current = termKey;
    setActiveDropTermKey(termKey);
  }

  function handleSemesterDragOver(event: React.DragEvent<HTMLElement>, termKey: string) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    activeDropTermKeyRef.current = termKey;
    setActiveDropTermKey(termKey);
  }

  function handleSemesterDrop(event: React.DragEvent<HTMLElement>, termKey: string) {
    event.preventDefault();
    event.stopPropagation();

    const payload =
      dragPayloadRef.current ??
      (() => {
        const rawPayload = event.dataTransfer.getData(DRAG_MIME_TYPE);
        return rawPayload ? (JSON.parse(rawPayload) as DragPayload) : null;
      })();

    if (!payload) {
      handleDragEnd();
      return;
    }

    activeDropTermKeyRef.current = null;
    dragPayloadRef.current = null;
    moveCourse(payload, termKey);
    handleDragEnd();
  }

  const startTermChoices = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => shiftTermKey(visibleStartTerm, index - 6)).map((termKey) => ({
        value: termKey,
        label: termLabel(termKey),
      })),
    [visibleStartTerm],
  );

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
              Search once, then drag likely courses into the semester columns while the plan is still flexible.
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
                draggable
                onDragStart={(event) => {
                  const payload: DragPayload = { code: course.code, sourceTermKey: null };
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
                  handleDragStart(payload);
                }}
                onDragEnd={handleDragEnd}
                className={`rounded-[1.35rem] border bg-[rgba(255,253,247,0.76)] p-4 shadow-[0_8px_20px_rgba(100,82,41,0.06)] ${
                  draggedCourseCode === course.code
                    ? "border-dashed border-[var(--ink)] opacity-70"
                    : "border-[var(--line)] hover:border-dashed hover:border-[var(--ink)]"
                } cursor-grab`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                    <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                  </div>
                  <span className="text-xs font-medium note-copy">{course.credits} cr</span>
                </div>
                <p className="mt-3 text-xs leading-5 note-copy">{course.department}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] note-copy">Drag into a semester column</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-col gap-5 rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,253,247,0.72)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="note-kicker">Planner</p>
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 w-full bg-transparent font-[family-name:var(--font-display-serif)] text-4xl tracking-tight text-stone-950 outline-none"
              />
              <p className="mt-2 text-sm note-copy">
                Drag course notes into semester columns, shift the visible term window, and keep previous or future semesters in view as needed.
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

        <div className="flex flex-col gap-4 rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,253,247,0.62)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="note-kicker">Visible Semesters</p>
              <p className="mt-2 text-sm note-copy">
                Move the window backward or forward so students in later years can include earlier semesters.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => updateVisibleStartTerm(shiftTermKey(visibleStartTerm, -1))}
                className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
              >
                Earlier
              </button>
              <select
                value={visibleStartTerm}
                onChange={(event) => updateVisibleStartTerm(event.target.value)}
                className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-4 py-2 text-sm text-stone-900 outline-none"
              >
                {startTermChoices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    Start at {choice.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => updateVisibleStartTerm(shiftTermKey(visibleStartTerm, 1))}
                className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
              >
                Later
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {visibleSemesters.map((semester) => (
                <article
                  key={semester.termKey}
                  onDragEnter={() => handleSemesterDragEnter(semester.termKey)}
                  onDragOver={(event) => handleSemesterDragOver(event, semester.termKey)}
                  onDragLeave={() => undefined}
                  onDrop={(event) => handleSemesterDrop(event, semester.termKey)}
                  className={`min-h-[30rem] w-[18rem] shrink-0 rounded-[1.8rem] border bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_12px_24px_rgba(100,82,41,0.08)] ${
                    activeDropTermKey === semester.termKey
                      ? "border-dashed border-[var(--ink)] bg-[rgba(255,242,191,0.82)]"
                      : "border-[var(--line)]"
                  }`}
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
                            draggable
                            onDragStart={(event) => {
                              const payload: DragPayload = { code: course.code, sourceTermKey: semester.termKey };
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
                              handleDragStart(payload);
                            }}
                            onDragEnd={handleDragEnd}
                            className={`rounded-[1.2rem] border bg-[var(--note)] p-4 shadow-[0_8px_18px_rgba(100,82,41,0.06)] ${
                              draggedCourseCode === course.code
                                ? "border-dashed border-[var(--ink)] opacity-70"
                                : "border-[var(--line)] hover:border-dashed hover:border-[var(--ink)]"
                            } cursor-grab`}
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
                            <p className="mt-2 text-xs note-copy">
                              {course.credits} credits · {course.offeredTerms.join(", ")}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-4 py-8 text-center text-sm note-copy">
                        Drop a course here
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
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
