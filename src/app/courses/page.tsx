import { CourseCard } from "@/components/courses/course-card";
import { getCatalogCourses } from "@/lib/courses/catalog";

export default async function CoursesPage() {
  const courses = await getCatalogCourses();

  return (
    <div className="space-y-8">
      <section className="note-panel-strong note-pin relative rounded-[2rem] p-8">
        <p className="note-kicker">Course Catalog</p>
        <h1 className="mt-3 font-[family-name:var(--font-display-serif)] text-4xl tracking-tight text-stone-950">
          Browse planning-ready UiO courses
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 note-copy">
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
