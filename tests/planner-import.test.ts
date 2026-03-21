import { describe, expect, test } from "bun:test";

import { mergeDraftFromPlan } from "@/lib/planner/import";
import type { PlannerDraft } from "@/lib/planner/types";

const targetDraft: PlannerDraft = {
  name: "Target",
  startTerm: "2026-autumn",
  completedCourses: ["IN1000"],
  semesters: [
    { termKey: "2026-autumn", courses: [{ code: "IN2000" }] },
    { termKey: "2027-spring", courses: [{ code: "IN2010" }] },
  ],
};

const sourceDraft: PlannerDraft = {
  name: "Source",
  startTerm: "2025-autumn",
  completedCourses: ["STK1100", "IN1000"],
  semesters: [
    { termKey: "2026-autumn", courses: [{ code: "IN2000" }, { code: "STK2100" }] },
    { termKey: "2027-autumn", courses: [{ code: "IN3000" }] },
  ],
};

describe("mergeDraftFromPlan", () => {
  test("merges completed courses and semesters while skipping duplicates", () => {
    const merged = mergeDraftFromPlan(targetDraft, sourceDraft, {
      includeCompletedCourses: true,
      includeSemesters: true,
    });

    expect(merged.completedCourses).toEqual(["IN1000", "STK1100"]);
    expect(merged.semesters).toEqual([
      { termKey: "2026-autumn", courses: [{ code: "IN2000" }, { code: "STK2100" }] },
      { termKey: "2027-spring", courses: [{ code: "IN2010" }] },
      { termKey: "2027-autumn", courses: [{ code: "IN3000" }] },
    ]);
  });

  test("can import only completed courses", () => {
    const merged = mergeDraftFromPlan(targetDraft, sourceDraft, {
      includeCompletedCourses: true,
      includeSemesters: false,
    });

    expect(merged.completedCourses).toEqual(["IN1000", "IN2000", "IN3000", "STK1100", "STK2100"]);
    expect(merged.semesters).toEqual(targetDraft.semesters);
  });

  test("can import only semesters", () => {
    const merged = mergeDraftFromPlan(targetDraft, sourceDraft, {
      includeCompletedCourses: false,
      includeSemesters: true,
    });

    expect(merged.completedCourses).toEqual(targetDraft.completedCourses);
    expect(merged.semesters).toEqual([
      { termKey: "2026-autumn", courses: [{ code: "IN2000" }, { code: "STK2100" }] },
      { termKey: "2027-spring", courses: [{ code: "IN2010" }] },
      { termKey: "2027-autumn", courses: [{ code: "IN3000" }] },
    ]);
  });
});
