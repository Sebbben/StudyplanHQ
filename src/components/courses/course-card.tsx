import Link from "next/link";

import type { PlannerCourse } from "@/lib/planner/types";

import { CourseBadge } from "./course-badge";

type CourseCardProps = {
  course: PlannerCourse;
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-amber-700">{course.code}</p>
          <h3 className="mt-1 text-lg font-semibold text-stone-950">{course.title}</h3>
        </div>
        <p className="text-sm font-medium text-stone-500">{course.credits} credits</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {course.offeredTerms.map((term) => (
          <CourseBadge key={`${course.code}-${term}`}>{term}</CourseBadge>
        ))}
        <CourseBadge>{course.department}</CourseBadge>
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-600">
        {course.prerequisiteText ?? "No formal prerequisite text in the imported dataset."}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Link
          href={`/courses/${course.code}`}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
        >
          View details
        </Link>
        <a
          href={course.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-950"
        >
          Official UiO page
        </a>
      </div>
    </article>
  );
}
