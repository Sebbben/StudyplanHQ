import { sampleCourses } from "@/data/sample-courses";
import { getCourseByCode, listCourseFacets, listCourses, listCoursesByCodes } from "@/lib/courses/service";

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
      .slice(0, filters?.limit)
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

export async function getCatalogCoursesByCodes(codes: string[]) {
  try {
    return await listCoursesByCodes(codes);
  } catch {
    const codeSet = new Set(codes);
    return sampleCourses.filter((course) => codeSet.has(course.code));
  }
}

export async function getCatalogCourseFacets() {
  try {
    return await listCourseFacets();
  } catch {
    return {
      departments: Array.from(new Set(sampleCourses.map((course) => course.department))).sort((left, right) =>
        left.localeCompare(right),
      ),
      levels: Array.from(new Set(sampleCourses.map((course) => course.level))).sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }
}
