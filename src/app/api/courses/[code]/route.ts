import { NextResponse } from "next/server";

import { getCatalogCourseByCode } from "@/lib/courses/catalog";

type CourseRouteProps = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(_: Request, { params }: CourseRouteProps) {
  const { code } = await params;
  const course = await getCatalogCourseByCode(code);

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ course });
}
