import type { PlannerCourse, PlannerDraft } from "@/lib/planner/types";

const COURSE_LOOKUP_BATCH_SIZE = 40;

export function collectDraftCourseCodes(draft: Pick<PlannerDraft, "completedCourses" | "semesters">) {
  return Array.from(
    new Set([
      ...draft.completedCourses,
      ...draft.semesters.flatMap((semester) => semester.courses.map((course) => course.code)),
    ]),
  );
}

export function mergeCoursesByCode(current: PlannerCourse[], nextCourses: PlannerCourse[]) {
  if (nextCourses.length === 0) {
    return current;
  }

  const byCode = new Map(current.map((course) => [course.code, course]));

  nextCourses.forEach((course) => {
    byCode.set(course.code, course);
  });

  return Array.from(byCode.values()).sort((left, right) => left.code.localeCompare(right.code));
}

export async function fetchCoursesByCodes(codes: string[], signal?: AbortSignal) {
  const uniqueCodes = Array.from(new Set(codes));

  if (uniqueCodes.length === 0) {
    return [];
  }

  const courses: PlannerCourse[] = [];

  for (let index = 0; index < uniqueCodes.length; index += COURSE_LOOKUP_BATCH_SIZE) {
    const batch = uniqueCodes.slice(index, index + COURSE_LOOKUP_BATCH_SIZE);
    const response = await fetch(`/api/courses?codes=${encodeURIComponent(batch.join(","))}`, { signal });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json().catch(() => null)) as { courses?: PlannerCourse[] } | null;

    if (payload?.courses) {
      courses.push(...payload.courses);
    }
  }

  return courses;
}
