import { sql } from "drizzle-orm";

import { sampleCourses } from "@/data/sample-courses";
import { db, pool } from "@/lib/db";
import { courses } from "@/lib/db/schema";

await db.execute(sql`select 1`);

await db
  .insert(courses)
  .values(sampleCourses.map((course) => ({ ...course, metadata: {} })))
  .onConflictDoUpdate({
    target: courses.code,
    set: {
      title: sql`excluded.title`,
      credits: sql`excluded.credits`,
      offeredTerms: sql`excluded.offered_terms`,
      language: sql`excluded.language`,
      level: sql`excluded.level`,
      department: sql`excluded.department`,
      officialUrl: sql`excluded.official_url`,
      prerequisiteText: sql`excluded.prerequisite_text`,
      prerequisiteCourses: sql`excluded.prerequisite_courses`,
      tags: sql`excluded.tags`,
      updatedAt: sql`now()`,
    },
  });

await pool.end();

console.log(`Seeded ${sampleCourses.length} courses.`);
