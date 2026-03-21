import { NextResponse } from "next/server";

import { getCatalogCourseFacets } from "@/lib/courses/catalog";

export async function GET() {
  const facets = await getCatalogCourseFacets();

  return NextResponse.json(facets);
}
