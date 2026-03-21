import { z } from "zod";

export const plannerDraftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startTerm: z.string().regex(/^\d{4}-(spring|autumn)$/),
  semesters: z
    .array(
      z.object({
        termKey: z.string().regex(/^\d{4}-(spring|autumn)$/),
        courses: z.array(
          z.object({
            code: z.string().trim().min(1).max(20),
          }),
        ),
      }),
    )
    .min(0)
    .max(12),
});
