import { describe, expect, test } from "bun:test";

import { sampleCourses } from "@/data/sample-courses";
import { validateDraft } from "@/lib/planner/validation";
import { plannerDraftSchema } from "@/lib/plans/schema";

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
  });
});
