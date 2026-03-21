import { and, asc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import type { PlannerCourse } from "@/lib/planner/types";

export type CourseFilters = {
  query?: string;
  term?: string;
  department?: string;
  limit?: number;
};

export async function listCourses(filters: CourseFilters = {}): Promise<PlannerCourse[]> {
  const conditions = [];

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(ilike(courses.code, pattern), ilike(courses.title, pattern)));
  }

  if (filters.department) {
    conditions.push(eq(courses.department, filters.department));
  }

  if (filters.term) {
    conditions.push(sql`${filters.term} = ANY(${courses.offeredTerms})`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(courses).where(whereClause).orderBy(asc(courses.code)).limit(filters.limit ?? 100);

  return rows.map((row) => ({
    code: row.code,
    title: row.title,
    credits: row.credits,
    offeredTerms: row.offeredTerms,
    language: row.language,
    level: row.level,
    department: row.department,
    officialUrl: row.officialUrl,
    prerequisiteText: row.prerequisiteText,
    prerequisiteCourses: row.prerequisiteCourses,
    tags: row.tags,
  }));
}

export async function getCourseByCode(code: string): Promise<PlannerCourse | null> {
  const [row] = await db.select().from(courses).where(eq(courses.code, code)).limit(1);

  if (!row) {
    return null;
  }

  return {
    code: row.code,
    title: row.title,
    credits: row.credits,
    offeredTerms: row.offeredTerms,
    language: row.language,
    level: row.level,
    department: row.department,
    officialUrl: row.officialUrl,
    prerequisiteText: row.prerequisiteText,
    prerequisiteCourses: row.prerequisiteCourses,
    tags: row.tags,
  };
}
