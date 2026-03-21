import { NextResponse } from "next/server";

import { getCatalogCourses } from "@/lib/courses/catalog";
import { filterAndRankCourses } from "@/lib/planner/course-search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const term = url.searchParams.get("term") ?? undefined;
  const department = url.searchParams.get("department") ?? undefined;
  const level = url.searchParams.get("level") ?? undefined;
  const requestedLimit = Number(url.searchParams.get("limit") ?? "60");
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 60;
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
