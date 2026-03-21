import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { plannedCourses, plannedSemesters, studyPlans } from "@/lib/db/schema";
import type { PlannerDraft } from "@/lib/planner/types";

export async function listPlansForUser(userId: number) {
  return db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.userId, userId), eq(studyPlans.deleted, false)))
    .orderBy(asc(studyPlans.updatedAt));
}

export async function getPlanById(planId: number, userId: number) {
  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId), eq(studyPlans.deleted, false)))
    .limit(1);

  if (!plan) {
    return null;
  }

  const semesters = await db
    .select()
    .from(plannedSemesters)
    .where(eq(plannedSemesters.planId, plan.id))
    .orderBy(asc(plannedSemesters.position));

  const semesterIds = semesters.map((semester) => semester.id);
  const courseRows =
    semesterIds.length === 0
      ? []
      : await db
          .select()
          .from(plannedCourses)
          .where(inArray(plannedCourses.semesterId, semesterIds))
          .orderBy(asc(plannedCourses.sortOrder));

  return {
    ...plan,
    semesters: semesters.map((semester) => ({
      termKey: semester.termKey,
      courses: courseRows
        .filter((course) => course.semesterId === semester.id)
        .map((course) => ({ code: course.courseCode })),
    })),
  };
}

export async function createPlan(userId: number, draft: PlannerDraft) {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(studyPlans)
      .values({
        userId,
        name: draft.name,
        startTerm: draft.startTerm,
      })
      .returning();

    for (const [index, semester] of draft.semesters.entries()) {
      const [savedSemester] = await tx
        .insert(plannedSemesters)
        .values({
          planId: plan.id,
          termKey: semester.termKey,
          position: index,
        })
        .returning();

      if (semester.courses.length > 0) {
        await tx.insert(plannedCourses).values(
          semester.courses.map((course, courseIndex) => ({
            semesterId: savedSemester.id,
            courseCode: course.code,
            sortOrder: courseIndex,
          })),
        );
      }
    }

    return plan;
  });
}

export async function updatePlan(planId: number, userId: number, draft: PlannerDraft) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId), eq(studyPlans.deleted, false)))
      .limit(1);

    if (!existing) {
      return null;
    }

    await tx
      .update(studyPlans)
      .set({
        name: draft.name,
        startTerm: draft.startTerm,
        updatedAt: new Date(),
      })
      .where(eq(studyPlans.id, planId));

    const semesters = await tx.select().from(plannedSemesters).where(eq(plannedSemesters.planId, planId));

    for (const semester of semesters) {
      await tx.delete(plannedCourses).where(eq(plannedCourses.semesterId, semester.id));
    }

    await tx.delete(plannedSemesters).where(eq(plannedSemesters.planId, planId));

    for (const [index, semester] of draft.semesters.entries()) {
      const [savedSemester] = await tx
        .insert(plannedSemesters)
        .values({
          planId,
          termKey: semester.termKey,
          position: index,
        })
        .returning();

      if (semester.courses.length > 0) {
        await tx.insert(plannedCourses).values(
          semester.courses.map((course, courseIndex) => ({
            semesterId: savedSemester.id,
            courseCode: course.code,
            sortOrder: courseIndex,
          })),
        );
      }
    }

    return existing;
  });
}

export async function deletePlan(planId: number, userId: number) {
  const [deleted] = await db
    .update(studyPlans)
    .set({
      deleted: true,
      updatedAt: new Date(),
    })
    .where(and(eq(studyPlans.id, planId), eq(studyPlans.userId, userId)))
    .returning();

  return deleted ?? null;
}
