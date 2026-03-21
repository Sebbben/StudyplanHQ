import { NextResponse } from "next/server";

import { getCatalogCourses } from "@/lib/courses/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const term = url.searchParams.get("term") ?? undefined;
  const department = url.searchParams.get("department") ?? undefined;
  const courses = await getCatalogCourses({ query, term, department });

  return NextResponse.json({ courses });
}
