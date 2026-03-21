import { compareTermKeys } from "@/lib/utils/term";

import type { PlannerCourse, PlannerDraft, PlannerIssue } from "@/lib/planner/types";

const MAX_RECOMMENDED_CREDITS = 30;

export function validateDraft(draft: PlannerDraft, courses: PlannerCourse[]): PlannerIssue[] {
  const issues: PlannerIssue[] = [];
  const courseMap = new Map(courses.map((course) => [course.code, course]));
  const placements = new Map<string, string[]>();

  for (const semester of draft.semesters) {
    let totalCredits = 0;

    for (const item of semester.courses) {
      const course = courseMap.get(item.code);
      if (!course) {
        continue;
      }

      totalCredits += course.credits;
      const entries = placements.get(item.code) ?? [];
      entries.push(semester.termKey);
      placements.set(item.code, entries);

      const termSeason = semester.termKey.split("-")[1];
      if (!course.offeredTerms.includes(termSeason)) {
        issues.push({
          type: "offering",
          severity: "warning",
          termKey: semester.termKey,
          courseCode: item.code,
          message: `${item.code} is not normally offered in ${termSeason}.`,
        });
      }
    }

    if (totalCredits > MAX_RECOMMENDED_CREDITS) {
      issues.push({
        type: "credit-load",
        severity: "warning",
        termKey: semester.termKey,
        message: `${semester.termKey} has ${totalCredits} credits, which is heavier than the recommended 30-credit load.`,
      });
    }
  }

  for (const [courseCode, terms] of placements.entries()) {
    if (terms.length > 1) {
      const [firstTerm] = [...terms].sort(compareTermKeys);
      issues.push({
        type: "duplicate",
        severity: "warning",
        termKey: firstTerm,
        courseCode,
        message: `${courseCode} appears in multiple semesters.`,
      });
    }
  }

  for (const semester of draft.semesters) {
    for (const item of semester.courses) {
      const course = courseMap.get(item.code);

      if (!course || course.prerequisiteCourses.length === 0) {
        continue;
      }

      for (const dependencyCode of course.prerequisiteCourses) {
        const dependencyTerms = placements.get(dependencyCode);

        if (!dependencyTerms || dependencyTerms.length === 0) {
          issues.push({
            type: "prerequisite",
            severity: "warning",
            termKey: semester.termKey,
            courseCode: item.code,
            message: `${item.code} depends on ${dependencyCode}, but ${dependencyCode} is not in the plan.`,
          });
          continue;
        }

        const dependencySatisfied = dependencyTerms.some(
          (dependencyTerm) => compareTermKeys(dependencyTerm, semester.termKey) < 0,
        );

        if (!dependencySatisfied) {
          issues.push({
            type: "prerequisite",
            severity: "warning",
            termKey: semester.termKey,
            courseCode: item.code,
            message: `${item.code} depends on ${dependencyCode}, but it is planned too late or in the same semester.`,
          });
        }
      }
    }
  }

  return issues;
}
