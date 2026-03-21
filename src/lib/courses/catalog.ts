import { sampleCourses } from "@/data/sample-courses";
import { getCourseByCode, listCourses } from "@/lib/courses/service";

export async function getCatalogCourses(filters?: Parameters<typeof listCourses>[0]) {
  try {
    return await listCourses(filters);
  } catch {
    const query = filters?.query?.toLowerCase();
    return sampleCourses
      .filter((course) => {
        if (filters?.term && !course.offeredTerms.includes(filters.term)) {
          return false;
        }

        if (filters?.department && course.department !== filters.department) {
          return false;
        }

        if (query) {
          const haystack = `${course.code} ${course.title} ${course.department} ${course.tags.join(" ")}`.toLowerCase();
          return haystack.includes(query);
        }

        return true;
      })
      .slice(0, filters?.limit ?? 100)
      .map((course) => ({ ...course }));
  }
}

export async function getCatalogCourseByCode(code: string) {
  try {
    return await getCourseByCode(code);
  } catch {
    return sampleCourses.find((course) => course.code === code) ?? null;
  }
}
