import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Start date must be a valid calendar date.");

export const createPlanSchema = z
  .object({
    templateSlug: z.string().trim().min(1),
    startDate: dateOnlySchema,
  })
  .strict();

export const updatePlanSchema = z
  .object({
    status: z.enum(["active", "paused", "completed"]).optional(),
    startDate: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => value.status !== undefined || value.startDate !== undefined, {
    message: "Provide a new status or start date.",
  });

export const planIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid plan id.");
