import { NextResponse } from "next/server";

import { getCatalogCourses, getCatalogCoursesByCodes } from "@/lib/courses/catalog";
import { filterAndRankCourses } from "@/lib/planner/course-search";

const DEFAULT_COURSE_LIMIT = 60;
const MAX_COURSE_LIMIT = 100;
const MAX_LOOKUP_CODES = 200;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codes = Array.from(
    new Set(
      (url.searchParams.get("codes") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  const query = url.searchParams.get("query") ?? undefined;
  const term = url.searchParams.get("term") ?? undefined;
  const department = url.searchParams.get("department") ?? undefined;
  const level = url.searchParams.get("level") ?? undefined;
  const requestedLimit = Number(url.searchParams.get("limit") ?? String(DEFAULT_COURSE_LIMIT));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_COURSE_LIMIT)
    : DEFAULT_COURSE_LIMIT;

  if (codes.length > 0) {
    if (codes.length > MAX_LOOKUP_CODES) {
      return NextResponse.json({ error: "Too many course codes requested." }, { status: 400 });
    }

    const courses = await getCatalogCoursesByCodes(codes);
    return NextResponse.json({ courses });
  }

  const courses = await getCatalogCourses({
    query,
    term,
    department,
    level,
    limit: query ? Math.max(limit, 200) : limit,
  });
  const rankedCourses = filterAndRankCourses(courses, {
    query: query ?? "",
    season: (term as "" | "spring" | "autumn" | undefined) ?? "",
    department: department ?? "",
    level: level ?? "",
  }).slice(0, limit);

  return NextResponse.json({ courses: rankedCourses });
}
