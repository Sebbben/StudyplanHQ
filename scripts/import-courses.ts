import { readFile } from "node:fs/promises";

import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";

import { db, pool } from "@/lib/db";
import { courses } from "@/lib/db/schema";

const fileFlag = process.argv.find((value) => value.startsWith("--file="));
const filePath = fileFlag?.split("=")[1];

if (!filePath) {
  throw new Error("Pass --file=/absolute/or/relative/path/to/file.json|csv");
}

const file = await readFile(filePath, "utf8");
const rows = filePath.endsWith(".json")
  ? JSON.parse(file)
  : parse(file, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

if (!Array.isArray(rows)) {
  throw new Error("Import file must contain an array of course rows.");
}

const values = rows.map((row, index) => {
  if (!row.code || !row.title || !row.credits || !row.department || !row.language || !row.level || !row.officialUrl) {
    throw new Error(`Row ${index + 1} is missing required fields.`);
  }

  return {
    code: row.code,
    title: row.title,
    credits: Number(row.credits),
    offeredTerms: Array.isArray(row.offeredTerms) ? row.offeredTerms : String(row.offeredTerms ?? "").split("|").filter(Boolean),
    language: row.language,
    level: row.level,
    department: row.department,
    officialUrl: row.officialUrl,
    prerequisiteText: row.prerequisiteText ?? null,
    prerequisiteCourses: Array.isArray(row.prerequisiteCourses)
      ? row.prerequisiteCourses
      : String(row.prerequisiteCourses ?? "").split("|").filter(Boolean),
    tags: Array.isArray(row.tags) ? row.tags : String(row.tags ?? "").split("|").filter(Boolean),
    metadata: {},
  };
});

await db.insert(courses).values(values).onConflictDoUpdate({
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

console.log(`Imported ${values.length} courses from ${filePath}.`);
