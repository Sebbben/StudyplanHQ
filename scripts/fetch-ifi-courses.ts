import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import { parseCourseDiscoveryListing, parseCoursePage } from "@/lib/courses/import";

const IFI_INDEX_URL = "https://www.uio.no/studier/emner/matnat/ifi/";
const DEFAULT_CONCURRENCY = 6;

const listingFlag = process.argv.find((value) => value.startsWith("--listing="));
const departmentFlag = process.argv.find((value) => value.startsWith("--department="));
const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const courseFlag = process.argv.find((value) => value.startsWith("--course="));
const limitFlag = process.argv.find((value) => value.startsWith("--limit="));

const listingUrl = listingFlag?.split("=")[1] ?? IFI_INDEX_URL;
const requestedCourses = new Set(
  (courseFlag?.split("=")[1] ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);
const limit = limitFlag ? Number(limitFlag.split("=")[1]) : null;
const departmentOverride = departmentFlag?.split("=")[1]?.trim() || null;
const listingSlug = new URL(listingUrl).pathname.split("/").filter(Boolean).at(-1) ?? "courses";
const defaultOutput =
  listingUrl === IFI_INDEX_URL ? "data/ifi-courses.json" : `data/${listingSlug}-courses.json`;
const outputPath = resolve(process.cwd(), outputFlag?.split("=")[1] ?? defaultOutput);

if (limitFlag && (!Number.isInteger(limit) || Number(limit) <= 0)) {
  throw new Error("Pass --limit as a positive integer.");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StudyPlanHQ course bootstrap (+https://github.com/HeadQuarters/StudyPlanHQ)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  worker: (value: TInput, index: number) => Promise<TOutput>,
) {
  const results = new Array<TOutput>(values.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()),
  );

  return results;
}

async function discoverCourses(startUrl: string) {
  const seenListingUrls = new Set<string>();
  const seenCourseCodes = new Set<string>();
  const discoveredCourses = [];
  const pendingListingUrls = [startUrl];

  while (pendingListingUrls.length > 0) {
    const currentListingUrl = pendingListingUrls.shift();

    if (!currentListingUrl || seenListingUrls.has(currentListingUrl)) {
      continue;
    }

    seenListingUrls.add(currentListingUrl);

    const listingHtml = await fetchText(currentListingUrl);
    const { courses, paginationUrls } = parseCourseDiscoveryListing(listingHtml, currentListingUrl);

    for (const course of courses) {
      if (seenCourseCodes.has(course.code)) {
        continue;
      }

      seenCourseCodes.add(course.code);
      discoveredCourses.push({
        ...course,
        department: departmentOverride ?? course.department,
      });
    }

    for (const paginationUrl of paginationUrls) {
      if (!seenListingUrls.has(paginationUrl)) {
        pendingListingUrls.push(paginationUrl);
      }
    }
  }

  return discoveredCourses;
}

const discoveredCourses = (await discoverCourses(listingUrl))
  .filter((course) => requestedCourses.size === 0 || requestedCourses.has(course.code))
  .slice(0, limit ?? undefined);

if (discoveredCourses.length === 0) {
  throw new Error("No courses matched the requested filters.");
}

const importedCourses = await mapWithConcurrency(discoveredCourses, DEFAULT_CONCURRENCY, async (course, index) => {
  const html = await fetchText(course.url);
  const parsed = parseCoursePage(html, course.url, course);

  console.log(`[${index + 1}/${discoveredCourses.length}] ${parsed.code}`);
  return parsed;
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(importedCourses, null, 2)}\n`, "utf8");

console.log(`Wrote ${importedCourses.length} courses from ${basename(listingUrl)} to ${outputPath}.`);
