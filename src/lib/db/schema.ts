import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    keycloakSubject: text("keycloak_subject").notNull(),
    email: text("email"),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subjectUnique: uniqueIndex("users_keycloak_subject_idx").on(table.keycloakSubject),
  }),
);

export const courses = pgTable("courses", {
  code: text("code").primaryKey(),
  title: text("title").notNull(),
  credits: doublePrecision("credits").notNull(),
  offeredTerms: text("offered_terms").array().notNull().default([]),
  language: text("language").notNull(),
  level: text("level").notNull(),
  department: text("department").notNull(),
  officialUrl: text("official_url").notNull(),
  prerequisiteText: text("prerequisite_text"),
  prerequisiteCourses: text("prerequisite_courses").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, string | string[] | number | null>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studyPlans = pgTable("study_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTerm: text("start_term").notNull(),
  completedCourseCodes: text("completed_course_codes").array().notNull().default([]),
  status: text("status").notNull().default("draft"),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const plannedSemesters = pgTable(
  "planned_semesters",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    planId: integer("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    termKey: text("term_key").notNull(),
    position: integer("position").notNull(),
  },
  (table) => ({
    planPositionUnique: uniqueIndex("planned_semesters_plan_position_idx").on(table.planId, table.position),
  }),
);

export const plannedCourses = pgTable(
  "planned_courses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => plannedSemesters.id, { onDelete: "cascade" }),
    courseCode: text("course_code")
      .notNull()
      .references(() => courses.code, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
  },
  (table) => ({
    semesterCourseUnique: uniqueIndex("planned_courses_semester_course_idx").on(table.semesterId, table.courseCode),
  }),
);
