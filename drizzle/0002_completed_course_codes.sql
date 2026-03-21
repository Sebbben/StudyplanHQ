ALTER TABLE "study_plans"
ADD COLUMN "completed_course_codes" text[] NOT NULL DEFAULT '{}';
