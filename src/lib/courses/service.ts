import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import type { PlannerCourse } from "@/lib/planner/types";

export type CourseFilters = {
  query?: string;
  term?: string;
  department?: string;
  level?: string;
  limit?: number;
};

export async function listCourses(filters: CourseFilters = {}): Promise<PlannerCourse[]> {
  const db = getDb();
  const conditions = [];

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(ilike(courses.code, pattern), ilike(courses.title, pattern), ilike(courses.department, pattern)));
  }

  if (filters.department) {
    conditions.push(eq(courses.department, filters.department));
  }

  if (filters.level) {
    conditions.push(eq(courses.level, filters.level));
  }

  if (filters.term) {
    conditions.push(sql`${filters.term} = ANY(${courses.offeredTerms})`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const query = db.select().from(courses).where(whereClause).orderBy(asc(courses.code));
  const rows = filters.limit ? await query.limit(filters.limit) : await query;

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
  const db = getDb();
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

export async function listCoursesByCodes(codes: string[]): Promise<PlannerCourse[]> {
  if (codes.length === 0) {
    return [];
  }

  const db = getDb();
  const rows = await db.select().from(courses).where(inArray(courses.code, codes)).orderBy(asc(courses.code));

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

export async function listCourseFacets() {
  const db = getDb();
  const rows = await db
    .select({
      department: courses.department,
      level: courses.level,
    })
    .from(courses)
    .orderBy(asc(courses.department), asc(courses.level));

  return {
    departments: Array.from(new Set(rows.map((row) => row.department))).filter(Boolean),
    levels: Array.from(new Set(rows.map((row) => row.level))).filter(Boolean),
  };
}
