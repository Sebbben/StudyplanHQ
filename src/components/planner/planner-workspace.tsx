"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { filterAndRankCourses, deriveDefaultStartTerm, getSeasonFromTermKey, reviewGroupLabel, sortIssuesForReview } from "@/lib/planner/course-search";
import type { PlannerCourse, PlannerDraft, PlannerIssue } from "@/lib/planner/types";
import { validateDraft } from "@/lib/planner/validation";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { buildSequentialTerms, compareTermKeys, shiftTermKey, termLabel } from "@/lib/utils/term";

const LOCAL_STORAGE_KEY = "studyplanhq-planner-draft";
const TERM_COUNT = 6;
const DRAG_MIME_TYPE = "text/plain";
const DEFAULT_PLAN_NAME = "Plan 1";

type PlannerWorkspaceProps = {
  courses: PlannerCourse[];
  initialDraft?: PlannerDraft;
  authenticated: boolean;
  planId?: number | null;
};

type DragPayload = {
  code: string;
  sourceTermKey: string | null;
};

type CourseFilterState = {
  query: string;
  season: "" | "spring" | "autumn";
  department: string;
  level: string;
};

function createEmptyDraft(): PlannerDraft {
  const startTerm = deriveDefaultStartTerm();
  return {
    name: DEFAULT_PLAN_NAME,
    startTerm,
    semesters: [],
  };
}

function createFilterState(): CourseFilterState {
  return {
    query: "",
    season: "",
    department: "",
    level: "",
  };
}

function buildTermChoices(anchorTerm: string, radius = 6) {
  return Array.from({ length: radius * 2 + 1 }, (_, index) => shiftTermKey(anchorTerm, index - radius)).map((termKey) => ({
    value: termKey,
    label: termLabel(termKey),
  }));
}

function issueActionText(issue: PlannerIssue) {
  if (issue.type === "prerequisite" && issue.courseCode && issue.termKey) {
    return `Move ${issue.courseCode} later or place its prerequisite before ${termLabel(issue.termKey)}.`;
  }

  if (issue.type === "offering" && issue.courseCode && issue.termKey) {
    return `Move ${issue.courseCode} out of ${termLabel(issue.termKey)} or keep it as an off-cycle exception.`;
  }

  if (issue.type === "credit-load" && issue.termKey) {
    return `Shift one course out of ${termLabel(issue.termKey)} to reduce the load.`;
  }

  if (issue.type === "duplicate" && issue.courseCode) {
    return `Keep ${issue.courseCode} in only one semester.`;
  }

  return issue.message;
}

export function PlannerWorkspace({ courses, initialDraft, authenticated, planId = null }: PlannerWorkspaceProps) {
  const router = useRouter();
  const isEditing = planId !== null;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const modalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const semesterRefs = useRef(new Map<string, HTMLElement | null>());
  const courseRefs = useRef(new Map<string, HTMLDivElement | null>());
  const highlightTimeoutRef = useRef<number | null>(null);

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
  const [planStartTerm, setPlanStartTerm] = useState<string>(() => initialDraft?.startTerm ?? draft.startTerm);
  const [visibleStartTerm, setVisibleStartTerm] = useState<string>(() => initialDraft?.startTerm ?? draft.startTerm);
  const [filters, setFilters] = useState<CourseFilterState>(() => createFilterState());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeDropTermKey, setActiveDropTermKey] = useState<string | null>(null);
  const [draggedCourseCode, setDraggedCourseCode] = useState<string | null>(null);
  const [activeReviewKey, setActiveReviewKey] = useState<string | null>(null);
  const [highlightedCourseKey, setHighlightedCourseKey] = useState<string | null>(null);
  const [modalTermKey, setModalTermKey] = useState<string | null>(null);
  const [modalFilters, setModalFilters] = useState<CourseFilterState>(() => createFilterState());
  const [selectedModalCourseCode, setSelectedModalCourseCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeDropTermKeyRef = useRef<string | null>(null);
  const dragPayloadRef = useRef<DragPayload | null>(null);

  useEffect(() => {
    if (!isEditing) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...draft, startTerm: planStartTerm }));
    }
  }, [draft, isEditing, planStartTerm]);

  useEffect(() => {
    if (!modalTermKey) {
      return;
    }

    modalSearchInputRef.current?.focus();
  }, [modalTermKey]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(courses.map((course) => course.department))).sort((left, right) => left.localeCompare(right)),
    [courses],
  );
  const levels = useMemo(
    () => Array.from(new Set(courses.map((course) => course.level))).sort((left, right) => left.localeCompare(right)),
    [courses],
  );

  const filteredCourses = useMemo(
    () =>
      filterAndRankCourses(courses, {
        query: filters.query,
        season: filters.season,
        department: filters.department,
        level: filters.level,
      }),
    [courses, filters],
  );

  const draftWithStartTerm = useMemo(
    () => ({
      ...draft,
      startTerm: planStartTerm,
    }),
    [draft, planStartTerm],
  );
  const issues = useMemo<PlannerIssue[]>(() => validateDraft(draftWithStartTerm, courses), [courses, draftWithStartTerm]);
  const sortedIssues = useMemo(() => sortIssuesForReview(issues), [issues]);
  const visibleTermKeys = useMemo(() => buildSequentialTerms(visibleStartTerm, TERM_COUNT), [visibleStartTerm]);
  const visibleSemesters = useMemo(() => {
    const semesterMap = new Map(draft.semesters.map((semester) => [semester.termKey, semester]));
    return visibleTermKeys.map((termKey) => ({
      termKey,
      courses: semesterMap.get(termKey)?.courses ?? [],
    }));
  }, [draft.semesters, visibleTermKeys]);
  const totalPlacedCourses = useMemo(
    () => draft.semesters.reduce((sum, semester) => sum + semester.courses.length, 0),
    [draft.semesters],
  );

  const modalSemester = modalTermKey ? draft.semesters.find((semester) => semester.termKey === modalTermKey) : null;
  const modalResults = useMemo(() => {
    if (!modalTermKey) {
      return [];
    }

    return filterAndRankCourses(courses, {
      query: modalFilters.query,
      season: modalFilters.season,
      department: modalFilters.department,
      level: modalFilters.level,
      excludeCodes: modalSemester?.courses.map((course) => course.code) ?? [],
    });
  }, [courses, modalFilters, modalSemester?.courses, modalTermKey]);
  const reviewGroups = useMemo(() => {
    const grouped = new Map<string, { label: string; issues: Array<{ issue: PlannerIssue; key: string }> }>();

    sortedIssues.forEach((issue, index) => {
      const groupKey = issue.termKey ?? "general";
      const entry = grouped.get(groupKey) ?? {
        label: reviewGroupLabel(issue.termKey),
        issues: [],
      };
      entry.issues.push({ issue, key: `${issue.type}-${issue.termKey ?? "general"}-${issue.courseCode ?? index}` });
      grouped.set(groupKey, entry);
    });

    return Array.from(grouped.entries()).map(([groupKey, value]) => ({
      groupKey,
      ...value,
    }));
  }, [sortedIssues]);

  const effectiveSelectedModalCourseCode =
    selectedModalCourseCode && modalResults.some((course) => course.code === selectedModalCourseCode)
      ? selectedModalCourseCode
      : modalResults[0]?.code ?? null;

  function sortSemesters(semesters: PlannerDraft["semesters"]) {
    return [...semesters].sort((left, right) => compareTermKeys(left.termKey, right.termKey));
  }

  function updateVisibleStartTerm(startTerm: string) {
    setVisibleStartTerm(startTerm);
  }

  function updatePlanStartTerm(startTerm: string) {
    setPlanStartTerm(startTerm);
    setVisibleStartTerm(startTerm);
  }

  function getCourse(code: string) {
    return courses.find((course) => course.code === code);
  }

  function updateSemesters(updater: (semesters: PlannerDraft["semesters"]) => PlannerDraft["semesters"]) {
    setDraft((current) => ({
      ...current,
      semesters: sortSemesters(updater(current.semesters).filter((semester) => semester.courses.length > 0)),
    }));
  }

  function addCourseToSemester(termKey: string, courseCode: string) {
    updateSemesters((semesters) => {
      const hasTargetSemester = semesters.some((semester) => semester.termKey === termKey);

      if (!hasTargetSemester) {
        return [...semesters, { termKey, courses: [{ code: courseCode }] }];
      }

      return semesters.map((semester) => {
        if (semester.termKey !== termKey) {
          return semester;
        }

        if (semester.courses.some((course) => course.code === courseCode)) {
          return semester;
        }

        return {
          ...semester,
          courses: [...semester.courses, { code: courseCode }],
        };
      });
    });
  }

  function removeCourse(termKey: string, courseCode: string) {
    updateSemesters((semesters) =>
      semesters.map((semester) => {
        if (semester.termKey !== termKey) {
          return semester;
        }

        return {
          ...semester,
          courses: semester.courses.filter((course) => course.code !== courseCode),
        };
      }),
    );
  }

  function moveCourse(payload: DragPayload, targetTermKey: string) {
    if (payload.sourceTermKey === targetTermKey) {
      return;
    }

    updateSemesters((semesters) => {
      const targetAlreadyHasCourse = semesters.some(
        (semester) => semester.termKey === targetTermKey && semester.courses.some((course) => course.code === payload.code),
      );

      if (targetAlreadyHasCourse) {
        return semesters;
      }

      const sourceSemester = payload.sourceTermKey
        ? semesters.find((semester) => semester.termKey === payload.sourceTermKey)
        : null;

      const withTarget = semesters.some((semester) => semester.termKey === targetTermKey)
        ? semesters
        : [...semesters, { termKey: targetTermKey, courses: [] }];

      return withTarget.map((semester) => {
        let nextCourses = semester.courses;

        if (payload.sourceTermKey && semester.termKey === payload.sourceTermKey) {
          nextCourses = semester.courses.filter((course) => course.code !== payload.code);
        }

        if (semester.termKey === targetTermKey) {
          const alreadyExists = nextCourses.some((course) => course.code === payload.code);
          if (!alreadyExists) {
            const sourceCourse =
              sourceSemester?.courses.find((course) => course.code === payload.code) ?? { code: payload.code };
            nextCourses = [...nextCourses, sourceCourse];
          }
        }

        return {
          ...semester,
          courses: nextCourses,
        };
      });
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

  function openAddCourseModal(termKey: string) {
    setModalTermKey(termKey);
    setModalFilters({
      query: "",
      season: getSeasonFromTermKey(termKey),
      department: "",
      level: "",
    });
  }

  function closeAddCourseModal() {
    setModalTermKey(null);
    setModalFilters(createFilterState());
    setSelectedModalCourseCode(null);
  }

  function focusCourseSearch() {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleAddFromModal(courseCode: string) {
    if (!modalTermKey) {
      return;
    }

    addCourseToSemester(modalTermKey, courseCode);
    closeAddCourseModal();
  }

  async function savePlan() {
    setSaveMessage(null);

    if (!authenticated) {
      setSaveMessage("Redirecting to login so you can save this plan.");
      window.location.href = `/api/auth/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const payload = {
      ...draft,
      startTerm: planStartTerm,
    };

    startTransition(async () => {
      const response = await fetch(isEditing ? `/api/plans/${planId}` : "/api/plans", {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveMessage(responsePayload?.error ?? "Failed to save the plan.");
        return;
      }

      if (isEditing) {
        setSaveMessage("Plan saved.");
        router.refresh();
        return;
      }

      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      const nextPlanId = responsePayload?.plan?.id;

      if (typeof nextPlanId === "number") {
        router.push(`/planner/${nextPlanId}`);
        router.refresh();
        return;
      }

      setSaveMessage("Plan saved.");
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

    if (payload) {
      activeDropTermKeyRef.current = null;
      dragPayloadRef.current = null;
      moveCourse(payload, termKey);
    }

    handleDragEnd();
  }

  function handleReviewClick(issue: PlannerIssue, reviewKey: string) {
    setActiveReviewKey(reviewKey);

    if (issue.termKey) {
      semesterRefs.current.get(issue.termKey)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }

    if (issue.termKey && issue.courseCode) {
      const courseKey = `${issue.termKey}:${issue.courseCode}`;
      setHighlightedCourseKey(courseKey);
      courseRefs.current.get(courseKey)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedCourseKey(null);
      }, 2200);
    }
  }

  function handleModalKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!modalTermKey) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeAddCourseModal();
      return;
    }

    if (modalResults.length === 0) {
      return;
    }

    const currentIndex = modalResults.findIndex((course) => course.code === effectiveSelectedModalCourseCode);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = Math.min(safeIndex + 1, modalResults.length - 1);
      setSelectedModalCourseCode(modalResults[nextIndex].code);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = Math.max(safeIndex - 1, 0);
      setSelectedModalCourseCode(modalResults[nextIndex].code);
    }

    if (event.key === "Enter" && effectiveSelectedModalCourseCode) {
      event.preventDefault();
      handleAddFromModal(effectiveSelectedModalCourseCode);
    }
  }

  const planStartTermChoices = useMemo(() => buildTermChoices(planStartTerm), [planStartTerm]);
  const visibleStartTermChoices = useMemo(() => buildTermChoices(visibleStartTerm), [visibleStartTerm]);
  const boardTitle = isEditing ? "Edit saved plan" : "Planner";
  const isUsingDefaultPlanName = draft.name.trim() === DEFAULT_PLAN_NAME;

  return (
    <>
      <div className="grid gap-6 2xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="note-panel note-pin relative rounded-[1.9rem] p-5">
          <div className="space-y-4">
            <div>
              <p className="note-kicker">Course Search</p>
              <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
                Browse likely courses before placing them
              </h2>
              <p className="mt-2 text-sm leading-6 note-copy">
                Search and filter the course list, then drag cards onto the board or use a semester add button for faster placement.
              </p>
            </div>
            <input
              ref={searchInputRef}
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search code, title, topic..."
              className="w-full rounded-[1.1rem] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <select
                value={filters.season}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, season: event.target.value as CourseFilterState["season"] }))
                }
                className="rounded-[1rem] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-3 py-2 text-sm text-stone-900 outline-none"
              >
                <option value="">Any term</option>
                <option value="autumn">Autumn</option>
                <option value="spring">Spring</option>
              </select>
              <select
                value={filters.department}
                onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}
                className="rounded-[1rem] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-3 py-2 text-sm text-stone-900 outline-none"
              >
                <option value="">Any department</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                value={filters.level}
                onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}
                className="rounded-[1rem] border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-3 py-2 text-sm text-stone-900 outline-none"
              >
                <option value="">Any level</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] note-copy">{filteredCourses.length} matching courses</p>
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
                  className={`cursor-grab rounded-[1.35rem] border bg-[rgba(255,253,247,0.76)] p-4 shadow-[0_8px_20px_rgba(100,82,41,0.06)] ${
                    draggedCourseCode === course.code
                      ? "border-dashed border-[var(--ink)] opacity-70"
                      : "border-[var(--line)] hover:border-dashed hover:border-[var(--ink)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                      <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                    </div>
                    <span className="text-xs font-medium note-copy">{course.credits} cr</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 note-copy">
                    {course.department} · {course.level}
                  </p>
                  <p className="mt-1 text-xs leading-5 note-copy">Normally offered: {course.offeredTerms.join(", ")}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] note-copy">Drag into a semester column</p>
                </div>
              ))}
              {filteredCourses.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] p-4 text-sm note-copy">
                  No courses match the current search and filters.
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-5 rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,253,247,0.72)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="note-kicker">{boardTitle}</p>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className={`mt-2 w-full cursor-text rounded-[0.7rem] border-b bg-transparent px-2 py-1 font-[family-name:var(--font-display-serif)] text-4xl tracking-tight outline-none ${
                    isUsingDefaultPlanName
                      ? "border-transparent text-stone-700 hover:border-[rgba(47,61,107,0.22)] hover:bg-[rgba(47,61,107,0.03)] focus:border-[rgba(47,61,107,0.34)] focus:bg-[rgba(47,61,107,0.05)] focus:text-stone-950"
                      : "border-transparent text-stone-950 hover:border-[rgba(47,61,107,0.22)] hover:bg-[rgba(47,61,107,0.03)] focus:border-[rgba(47,61,107,0.34)] focus:bg-[rgba(47,61,107,0.05)]"
                  }`}
                />
                <p className="mt-2 text-sm note-copy">
                  Drag courses onto the board or add them directly from a semester search modal. Visible semesters are only a view window.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Link
                    href="/planner"
                    className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-5 py-3 text-sm font-medium text-stone-800 hover:border-[var(--ink)] hover:text-stone-950"
                  >
                    New plan
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={savePlan}
                  disabled={isPending}
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Saving..." : isEditing ? "Save changes" : "Save plan"}
                </button>
                {saveMessage ? <p className="text-sm note-copy">{saveMessage}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,253,247,0.84)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] note-copy">Plan starts in</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <select
                    value={planStartTerm}
                    onChange={(event) => updatePlanStartTerm(event.target.value)}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-stone-900 outline-none"
                  >
                    {planStartTermChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm note-copy">Saved with the plan even if you browse other semesters.</span>
                </div>
              </div>
              <div className="rounded-[1.3rem] border border-[var(--line)] bg-[rgba(255,253,247,0.84)] p-4">
                <p className="text-xs uppercase tracking-[0.14em] note-copy">Visible semesters</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateVisibleStartTerm(shiftTermKey(visibleStartTerm, -1))}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
                  >
                    Earlier
                  </button>
                  <select
                    value={visibleStartTerm}
                    onChange={(event) => updateVisibleStartTerm(event.target.value)}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-stone-900 outline-none"
                  >
                    {visibleStartTermChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        Start at {choice.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateVisibleStartTerm(shiftTermKey(visibleStartTerm, 1))}
                    className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>

          {totalPlacedCourses === 0 ? (
            <div className="note-panel-strong rounded-[1.8rem] p-6">
              <p className="note-kicker">Start Here</p>
              <h2 className="mt-3 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
                Pick a starting term, then add your first course
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 note-copy">
                Start with one likely semester. You can drag courses across the board later, open the semester search modal when you know where a course should go, and use the review panel once the draft starts taking shape.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openAddCourseModal(visibleTermKeys[0])}
                  className="rounded-full border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-sm font-medium text-white hover:opacity-92"
                >
                  Add to {termLabel(visibleTermKeys[0])}
                </button>
                <button
                  type="button"
                  onClick={focusCourseSearch}
                  className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-5 py-3 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
                >
                  Browse courses
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,253,247,0.62)] p-4 sm:p-5">
            <div className="space-y-4">
              {visibleSemesters.map((semester, index) => (
                <article
                  key={semester.termKey}
                  ref={(element) => {
                    semesterRefs.current.set(semester.termKey, element);
                  }}
                  onDragEnter={() => handleSemesterDragEnter(semester.termKey)}
                  onDragOver={(event) => handleSemesterDragOver(event, semester.termKey)}
                  onDrop={(event) => handleSemesterDrop(event, semester.termKey)}
                  className={`rounded-[1.8rem] border bg-[rgba(255,253,247,0.9)] p-5 shadow-[0_12px_24px_rgba(100,82,41,0.08)] ${
                    activeDropTermKey === semester.termKey
                      ? "border-dashed border-[var(--ink)] bg-[rgba(255,242,191,0.82)]"
                      : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex flex-col gap-4 border-b border-[rgba(113,92,60,0.12)] pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="note-chip mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                          {semester.termKey}
                        </p>
                        <h3 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
                          {termLabel(semester.termKey)}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="note-chip rounded-full px-3 py-1 text-sm font-medium">
                        {semesterCredits(semester.termKey)} cr
                      </span>
                      <button
                        type="button"
                        onClick={() => openAddCourseModal(semester.termKey)}
                        className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-800 hover:border-[var(--ink)]"
                      >
                        Add course
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    {semester.courses.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {semester.courses.map((item) => {
                          const course = getCourse(item.code);
                          if (!course) {
                            return null;
                          }

                          const courseKey = `${semester.termKey}:${course.code}`;

                          return (
                            <div
                              key={courseKey}
                              ref={(element) => {
                                courseRefs.current.set(courseKey, element);
                              }}
                              draggable
                              onDragStart={(event) => {
                                const payload: DragPayload = { code: course.code, sourceTermKey: semester.termKey };
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
                                handleDragStart(payload);
                              }}
                              onDragEnd={handleDragEnd}
                              className={`cursor-grab rounded-[1.2rem] border bg-[var(--note)] p-4 shadow-[0_8px_18px_rgba(100,82,41,0.06)] ${
                                draggedCourseCode === course.code
                                  ? "border-dashed border-[var(--ink)] opacity-70"
                                  : "border-[var(--line)] hover:border-dashed hover:border-[var(--ink)]"
                              } ${highlightedCourseKey === courseKey ? "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-transparent" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                                    <p className="text-xs note-copy">{course.credits} credits</p>
                                  </div>
                                  <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                                  <p className="mt-2 text-xs note-copy">{course.offeredTerms.join(", ")}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCourse(semester.termKey, course.code)}
                                  className="shrink-0 text-sm note-copy hover:text-stone-950"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] px-4 py-8 text-center text-sm note-copy">
                        <p>Drop a course here or open the semester search.</p>
                        <button
                          type="button"
                          onClick={() => openAddCourseModal(semester.termKey)}
                          className="mt-4 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
                        >
                          Add course
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="note-panel note-pin relative rounded-[1.9rem] p-5">
          <p className="note-kicker">Plan Review</p>
          <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">Warnings and guidance</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--note-green)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] note-copy">Courses</p>
              <p className="mt-2 text-3xl font-semibold text-stone-950">{totalPlacedCourses}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--note-rose)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] note-copy">Warnings</p>
              <p className="mt-2 text-3xl font-semibold text-stone-950">{issues.length}</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {issues.length > 0 ? (
              reviewGroups.map((group) => (
                <section key={group.groupKey} className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.14em] note-copy">{group.label}</p>
                  {group.issues.map(({ issue, key }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleReviewClick(issue, key)}
                      className={`block w-full rounded-[1.2rem] border p-4 text-left ${
                        activeReviewKey === key
                          ? "border-[var(--ink)] bg-[rgba(224,231,251,0.72)]"
                          : "border-[rgba(122,95,46,0.18)] bg-[var(--warning-soft)]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-stone-950">{issueActionText(issue)}</p>
                      <p className="mt-2 text-xs leading-5 note-copy">{issue.message}</p>
                    </button>
                  ))}
                </section>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-[rgba(77,109,58,0.18)] bg-[var(--success-soft)] p-4 text-sm text-stone-950">
                The current draft has no detected prerequisite, offering, duplicate, or load warnings.
              </div>
            )}
          </div>
        </aside>
      </div>

      {modalTermKey ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,36,26,0.4)] px-4 py-8"
          onClick={closeAddCourseModal}
        >
          <div
            className="note-panel-strong max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
              <div>
                <p className="note-kicker">Add To Semester</p>
                <h2 className="mt-2 font-[family-name:var(--font-display-serif)] text-3xl text-stone-950">
                  {termLabel(modalTermKey)}
                </h2>
                <p className="mt-2 text-sm note-copy">
                  Press Enter to add the selected course. Click any result to add it immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddCourseModal}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <input
                ref={modalSearchInputRef}
                value={modalFilters.query}
                onChange={(event) => setModalFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Search course code, title, topic..."
                className="w-full rounded-[1.1rem] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={modalFilters.season}
                  onChange={(event) =>
                    setModalFilters((current) => ({ ...current, season: event.target.value as CourseFilterState["season"] }))
                  }
                  className="rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-stone-900 outline-none"
                >
                  <option value="">Any term</option>
                  <option value="autumn">Autumn</option>
                  <option value="spring">Spring</option>
                </select>
                <select
                  value={modalFilters.department}
                  onChange={(event) => setModalFilters((current) => ({ ...current, department: event.target.value }))}
                  className="rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-stone-900 outline-none"
                >
                  <option value="">Any department</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                <select
                  value={modalFilters.level}
                  onChange={(event) => setModalFilters((current) => ({ ...current, level: event.target.value }))}
                  className="rounded-[1rem] border border-[var(--line)] bg-white px-3 py-2 text-sm text-stone-900 outline-none"
                >
                  <option value="">Any level</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {modalResults.map((course) => (
                  <button
                    key={course.code}
                    type="button"
                    onMouseEnter={() => setSelectedModalCourseCode(course.code)}
                    onClick={() => handleAddFromModal(course.code)}
                    className={`block w-full rounded-[1.3rem] border p-4 text-left shadow-[0_8px_20px_rgba(100,82,41,0.06)] ${
                      effectiveSelectedModalCourseCode === course.code
                        ? "border-[var(--ink)] bg-[rgba(224,231,251,0.72)]"
                        : "border-[var(--line)] bg-[rgba(255,253,247,0.84)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--ink)]">{course.code}</p>
                        <p className="mt-1 text-sm font-medium text-stone-900">{course.title}</p>
                      </div>
                      <span className="text-xs font-medium note-copy">{course.credits} cr</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 note-copy">
                      {course.department} · {course.level} · {course.offeredTerms.join(", ")}
                    </p>
                  </button>
                ))}
                {modalResults.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,253,247,0.72)] p-4 text-sm note-copy">
                    No courses match this semester search.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
