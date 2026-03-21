import { describe, expect, test } from "bun:test";

import { sampleCourses } from "@/data/sample-courses";
import { validateDraft } from "@/lib/planner/validation";
import { plannerDraftSchema } from "@/lib/plans/schema";
import type { PlannerCourse } from "@/lib/planner/types";

describe("validateDraft", () => {
  test("warns when prerequisites are missing or too late", () => {
    const issues = validateDraft(
      {
        name: "Test",
        startTerm: "2026-autumn",
        semesters: [
          { termKey: "2026-autumn", courses: [{ code: "IN1010" }] },
          { termKey: "2027-spring", courses: [] },
        ],
      },
      sampleCourses.map((course) => ({ ...course })),
    );

    expect(issues.some((issue) => issue.type === "prerequisite")).toBeTrue();
  });

  test("warns about duplicate courses and overloaded semesters", () => {
    const issues = validateDraft(
      {
        name: "Heavy",
        startTerm: "2026-autumn",
        semesters: [
          {
            termKey: "2026-autumn",
            courses: [{ code: "IN1000" }, { code: "IN1000" }, { code: "STK1100" }, { code: "MAT1100" }],
          },
        ],
      },
      sampleCourses.map((course) => ({ ...course })),
    );

    const duplicateIssue = issues.find((issue) => issue.type === "duplicate");

    expect(duplicateIssue).toBeDefined();
    expect(duplicateIssue?.termKey).toBe("2026-autumn");
    expect(issues.some((issue) => issue.type === "credit-load")).toBeTrue();
  });

  test("accepts an empty draft while the user is still starting", () => {
    const parsed = plannerDraftSchema.safeParse({
      name: "Fresh plan",
      startTerm: "2026-autumn",
      semesters: [],
    });

    expect(parsed.success).toBeTrue();
    if (parsed.success) {
      expect(parsed.data.completedCourses).toEqual([]);
    }
  });

  test("treats completed courses as satisfying prerequisites before the plan starts", () => {
    const courses: PlannerCourse[] = [
      {
        code: "IN2090",
        title: "Databaser og datamodellering",
        credits: 10,
        offeredTerms: ["autumn"],
        language: "Norwegian",
        level: "Bachelor",
        department: "Informatics",
        officialUrl: "https://example.com/in2090",
        prerequisiteText: "IN1000 – Introduksjon til objektorientert programmering",
        prerequisiteCourses: ["IN1000"],
        tags: [],
      },
      {
        code: "IN1000",
        title: "Introduksjon til objektorientert programmering",
        credits: 10,
        offeredTerms: ["spring"],
        language: "Norwegian",
        level: "Bachelor",
        department: "Informatics",
        officialUrl: "https://example.com/in1000",
        prerequisiteText: null,
        prerequisiteCourses: [],
        tags: [],
      },
    ];

    const issues = validateDraft(
      {
        name: "Master plan",
        startTerm: "2026-autumn",
        completedCourses: ["IN1000"],
        semesters: [{ termKey: "2026-autumn", courses: [{ code: "IN2090" }] }],
      },
      courses,
    );

    expect(issues.some((issue) => issue.type === "prerequisite")).toBeFalse();
  });

  test("treats slash-separated mandatory prerequisite alternatives as one requirement", () => {
    const courses: PlannerCourse[] = [
      {
        code: "IN2090",
        title: "Databaser og datamodellering",
        credits: 10,
        offeredTerms: ["autumn"],
        language: "Norwegian",
        level: "Bachelor",
        department: "Informatics",
        officialUrl: "https://example.com/in2090",
        prerequisiteText:
          "IN1000 – Introduksjon til objektorientert programmering / INF1000 – Grunnkurs i objektorientert programmering / INF1001 – Grunnkurs i objektorientert programmering / INF1100 – Grunnkurs i programmering",
        prerequisiteCourses: ["IN1000", "INF1000", "INF1001", "INF1100"],
        tags: [],
      },
      {
        code: "INF1100",
        title: "Grunnkurs i programmering",
        credits: 10,
        offeredTerms: ["spring"],
        language: "Norwegian",
        level: "Bachelor",
        department: "Informatics",
        officialUrl: "https://example.com/inf1100",
        prerequisiteText: null,
        prerequisiteCourses: [],
        tags: [],
      },
    ];

    const issues = validateDraft(
      {
        name: "Alternative requirement",
        startTerm: "2026-spring",
        completedCourses: [],
        semesters: [
          { termKey: "2026-spring", courses: [{ code: "INF1100" }] },
          { termKey: "2026-autumn", courses: [{ code: "IN2090" }] },
        ],
      },
      courses,
    );

    expect(issues.some((issue) => issue.type === "prerequisite")).toBeFalse();
  });

  test("still requires separate mandatory courses joined by 'og'", () => {
    const courses: PlannerCourse[] = [
      {
        code: "IN4230",
        title: "Nettverk",
        credits: 10,
        offeredTerms: ["autumn"],
        language: "Norwegian",
        level: "Master",
        department: "Informatics",
        officialUrl: "https://example.com/in4230",
        prerequisiteText:
          "Emnet bygger på IN2140 – Introduksjon til operativsystemer og datakommunikasjon og IN2010 – Algoritmer og datastrukturer",
        prerequisiteCourses: ["IN2140", "IN2010"],
        tags: [],
      },
      {
        code: "IN2140",
        title: "Introduksjon til operativsystemer og datakommunikasjon",
        credits: 10,
        offeredTerms: ["spring"],
        language: "Norwegian",
        level: "Bachelor",
        department: "Informatics",
        officialUrl: "https://example.com/in2140",
        prerequisiteText: null,
        prerequisiteCourses: [],
        tags: [],
      },
    ];

    const issues = validateDraft(
      {
        name: "Separate requirements",
        startTerm: "2026-spring",
        completedCourses: [],
        semesters: [
          { termKey: "2026-spring", courses: [{ code: "IN2140" }] },
          { termKey: "2026-autumn", courses: [{ code: "IN4230" }] },
        ],
      },
      courses,
    );

    expect(issues.some((issue) => issue.type === "prerequisite")).toBeTrue();
  });
});
