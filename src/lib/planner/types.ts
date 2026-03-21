export type PlannerCourse = {
  code: string;
  title: string;
  credits: number;
  offeredTerms: string[];
  language: string;
  level: string;
  department: string;
  officialUrl: string;
  prerequisiteText: string | null;
  prerequisiteCourses: string[];
  tags: string[];
};

export type PlannedCourse = {
  code: string;
};

export type PlannedSemester = {
  termKey: string;
  courses: PlannedCourse[];
};

export type PlannerDraft = {
  name: string;
  startTerm: string;
  completedCourses: string[];
  semesters: PlannedSemester[];
};

export type PlannerIssue = {
  type: "prerequisite" | "offering" | "credit-load" | "duplicate";
  severity: "info" | "warning";
  termKey?: string;
  courseCode?: string;
  message: string;
};
