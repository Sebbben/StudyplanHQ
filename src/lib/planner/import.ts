import type { PlannerDraft } from "@/lib/planner/types";
import { compareTermKeys } from "@/lib/utils/term";

export type PlanImportOptions = {
  includeCompletedCourses: boolean;
  includeSemesters: boolean;
};

function sortSemesters(draft: PlannerDraft["semesters"]) {
  return [...draft].sort((left, right) => compareTermKeys(left.termKey, right.termKey));
}

function getCompletedCourseCodesFromSource(source: PlannerDraft, options: PlanImportOptions) {
  const sourceCompletedCourses = [...source.completedCourses];

  if (!options.includeCompletedCourses) {
    return sourceCompletedCourses;
  }

  if (options.includeSemesters) {
    return sourceCompletedCourses;
  }

  return Array.from(
    new Set([
      ...sourceCompletedCourses,
      ...source.semesters.flatMap((semester) => semester.courses.map((course) => course.code)),
    ]),
  ).sort((left, right) => left.localeCompare(right));
}

export function mergeDraftFromPlan(
  target: PlannerDraft,
  source: PlannerDraft,
  options: PlanImportOptions,
): PlannerDraft {
  const nextCompletedCourses = options.includeCompletedCourses
    ? Array.from(new Set([...target.completedCourses, ...getCompletedCourseCodesFromSource(source, options)])).sort((left, right) =>
        left.localeCompare(right),
      )
    : target.completedCourses;

  if (!options.includeSemesters) {
    return {
      ...target,
      completedCourses: nextCompletedCourses,
    };
  }

  const semesterMap = new Map(
    target.semesters.map((semester) => [
      semester.termKey,
      {
        ...semester,
        courses: [...semester.courses],
      },
    ]),
  );

  for (const sourceSemester of source.semesters) {
    const existingSemester = semesterMap.get(sourceSemester.termKey);

    if (!existingSemester) {
      semesterMap.set(sourceSemester.termKey, {
        termKey: sourceSemester.termKey,
        courses: [...sourceSemester.courses],
      });
      continue;
    }

    const existingCodes = new Set(existingSemester.courses.map((course) => course.code));

    for (const sourceCourse of sourceSemester.courses) {
      if (!existingCodes.has(sourceCourse.code)) {
        existingSemester.courses.push(sourceCourse);
        existingCodes.add(sourceCourse.code);
      }
    }
  }

  return {
    ...target,
    completedCourses: nextCompletedCourses,
    semesters: sortSemesters(Array.from(semesterMap.values())),
  };
}
