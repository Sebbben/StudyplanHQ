import { describe, expect, test } from "bun:test";

import { filterAndRankCourses } from "@/lib/planner/course-search";
import type { PlannerCourse } from "@/lib/planner/types";

const courses: PlannerCourse[] = [
  {
    code: "IN1000",
    title: "Introduction to Programming",
    credits: 10,
    offeredTerms: ["autumn", "spring"],
    language: "Norwegian",
    level: "Bachelor",
    department: "Informatics",
    officialUrl: "https://example.com/in1000",
    prerequisiteText: null,
    prerequisiteCourses: [],
    tags: ["programming"],
  },
  {
    code: "IN1010",
    title: "Object-Oriented Programming",
    credits: 10,
    offeredTerms: ["spring"],
    language: "Norwegian",
    level: "Bachelor",
    department: "Informatics",
    officialUrl: "https://example.com/in1010",
    prerequisiteText: null,
    prerequisiteCourses: [],
    tags: ["oop"],
  },
  {
    code: "STK1100",
    title: "Probability and Statistics",
    credits: 10,
    offeredTerms: ["autumn"],
    language: "Norwegian",
    level: "Bachelor",
    department: "Statistics",
    officialUrl: "https://example.com/stk1100",
    prerequisiteText: null,
    prerequisiteCourses: [],
    tags: ["math"],
  },
];

describe("filterAndRankCourses", () => {
  test("prioritizes exact code matches over prefix and contains matches", () => {
    const results = filterAndRankCourses(courses, {
      query: "in1000",
      season: "",
      department: "",
      level: "",
    });

    expect(results.map((course) => course.code)).toEqual(["IN1000"]);
  });

  test("filters by season, department, level, and excluded codes", () => {
    const results = filterAndRankCourses(courses, {
      query: "",
      season: "autumn",
      department: "Informatics",
      level: "Bachelor",
      excludeCodes: ["IN1000"],
    });

    expect(results.map((course) => course.code)).toEqual([]);
  });

  test("keeps prefix matches ahead of broader text matches", () => {
    const results = filterAndRankCourses(courses, {
      query: "in1",
      season: "",
      department: "",
      level: "",
    });

    expect(results.map((course) => course.code)).toEqual(["IN1000", "IN1010"]);
  });
});
