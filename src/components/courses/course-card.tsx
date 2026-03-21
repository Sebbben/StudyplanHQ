import Link from "next/link";

import type { PlannerCourse } from "@/lib/planner/types";

import { CourseBadge } from "./course-badge";

type CourseCardProps = {
  course: PlannerCourse;
};

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="note-panel note-pin relative rounded-[1.8rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold tracking-wide text-[var(--ink)]">{course.code}</p>
          <h3 className="mt-1 font-[family-name:var(--font-display-serif)] text-3xl leading-tight text-stone-950">
            {course.title}
          </h3>
        </div>
        <p className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.84)] px-3 py-1 text-sm font-medium note-copy">
          {course.credits} credits
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {course.offeredTerms.map((term) => (
          <CourseBadge key={`${course.code}-${term}`}>{term}</CourseBadge>
        ))}
        <CourseBadge>{course.department}</CourseBadge>
      </div>
      <p className="mt-4 text-sm leading-7 note-copy">
        {course.prerequisiteText ?? "No formal prerequisite text in the imported dataset."}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Link
          href={`/courses/${course.code}`}
          className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.86)] px-4 py-2 text-sm font-medium text-stone-800 hover:border-[var(--ink)] hover:text-stone-950"
        >
          View details
        </Link>
        <a
          href={course.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium note-copy underline decoration-[var(--line)] underline-offset-4 hover:text-stone-950"
        >
          Official UiO page
        </a>
      </div>
    </article>
  );
}
