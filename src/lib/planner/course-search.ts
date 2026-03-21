import type { PlannerCourse, PlannerIssue } from "@/lib/planner/types";
import { compareTermKeys, parseTermKey, termLabel, type TermSeason } from "@/lib/utils/term";

export type PlannerCourseFilters = {
  query: string;
  season: "" | TermSeason;
  department: string;
  level: string;
  excludeCodes?: string[];
};

function scoreCourseMatch(course: PlannerCourse, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 3;
  }

  const code = course.code.toLowerCase();
  const title = course.title.toLowerCase();
  const department = course.department.toLowerCase();
  const tags = course.tags.map((tag) => tag.toLowerCase());

  if (code === normalizedQuery) {
    return 0;
  }

  if (code.startsWith(normalizedQuery)) {
    return 1;
  }

  const containsQuery =
    title.includes(normalizedQuery) ||
    department.includes(normalizedQuery) ||
    tags.some((tag) => tag.includes(normalizedQuery)) ||
    code.includes(normalizedQuery);

  return containsQuery ? 2 : Number.POSITIVE_INFINITY;
}

export function filterAndRankCourses(courses: PlannerCourse[], filters: PlannerCourseFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const excludedCodes = new Set(filters.excludeCodes ?? []);

  return courses
    .filter((course) => {
      if (excludedCodes.has(course.code)) {
        return false;
      }

      if (filters.season && !course.offeredTerms.includes(filters.season)) {
        return false;
      }

      if (filters.department && course.department !== filters.department) {
        return false;
      }

      if (filters.level && course.level !== filters.level) {
        return false;
      }

      return scoreCourseMatch(course, normalizedQuery) !== Number.POSITIVE_INFINITY;
    })
    .sort((left, right) => {
      const leftScore = scoreCourseMatch(left, normalizedQuery);
      const rightScore = scoreCourseMatch(right, normalizedQuery);

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return left.code.localeCompare(right.code);
    });
}

export function deriveDefaultStartTerm(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const season: TermSeason = month >= 6 ? "autumn" : "spring";

  return `${year}-${season}`;
}

export function getSeasonFromTermKey(termKey: string) {
  return parseTermKey(termKey).season;
}

export function sortIssuesForReview(issues: PlannerIssue[]) {
  return [...issues].sort((left, right) => {
    if (left.termKey && right.termKey) {
      const termComparison = compareTermKeys(left.termKey, right.termKey);
      if (termComparison !== 0) {
        return termComparison;
      }
    } else if (left.termKey) {
      return -1;
    } else if (right.termKey) {
      return 1;
    }

    if (left.courseCode && right.courseCode && left.courseCode !== right.courseCode) {
      return left.courseCode.localeCompare(right.courseCode);
    }

    if (left.type !== right.type) {
      return left.type.localeCompare(right.type);
    }

    return left.message.localeCompare(right.message);
  });
}

export function reviewGroupLabel(termKey?: string) {
  return termKey ? termLabel(termKey) : "General guidance";
}
