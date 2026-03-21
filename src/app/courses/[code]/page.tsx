import { notFound } from "next/navigation";

import { CourseBadge } from "@/components/courses/course-badge";
import { getCatalogCourseByCode } from "@/lib/courses/catalog";

type CourseDetailPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { code } = await params;
  const course = await getCatalogCourseByCode(code);

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">{course.code}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">{course.title}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <CourseBadge>{course.credits} credits</CourseBadge>
          <CourseBadge>{course.department}</CourseBadge>
          <CourseBadge>{course.level}</CourseBadge>
          <CourseBadge>{course.language}</CourseBadge>
          {course.offeredTerms.map((term) => (
            <CourseBadge key={`${course.code}-${term}`}>{term}</CourseBadge>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
          <h2 className="text-2xl font-semibold text-stone-950">Planning notes</h2>
          <p className="mt-4 text-base leading-8 text-stone-600">
            {course.prerequisiteText ?? "No prerequisite text was included in the imported course dataset."}
          </p>
          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Parsed prerequisite references</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {course.prerequisiteCourses.length > 0 ? (
                course.prerequisiteCourses.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No structured prerequisite references in the current dataset.</li>
              )}
            </ul>
          </div>
        </article>
        <article className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm shadow-stone-950/5">
          <h2 className="text-2xl font-semibold text-stone-950">Official source</h2>
          <p className="mt-4 text-base leading-8 text-stone-600">
            Use the official UiO course page for authoritative descriptions, admission details, and updates.
          </p>
          <a
            href={course.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Open official UiO course page
          </a>
        </article>
      </section>
    </div>
  );
}
