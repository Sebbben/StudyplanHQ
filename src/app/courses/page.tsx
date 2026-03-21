import { CourseCard } from "@/components/courses/course-card";
import { getCatalogCourses } from "@/lib/courses/catalog";

export default async function CoursesPage() {
  const courses = await getCatalogCourses();

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">Course Catalog</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">Browse planning-ready UiO courses</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          The catalog prioritizes the information students actually need for planning: credits, department, normal semester availability, and prerequisite context.
        </p>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.code} course={course} />
        ))}
      </section>
    </div>
  );
}
