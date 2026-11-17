import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date.");

export const updatePlanTaskSchema = z
  .object({
    done: z.boolean().optional(),
    hoursSpent: z.number().min(0).max(24).optional(),
    notes: z.string().max(10000).optional(),
    title: z.string().trim().max(500).optional(),
    date: dateOnlySchema.optional(),
    resetToTemplate: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one task field to update.",
  })
  .refine((value) => !(value.resetToTemplate && value.title !== undefined), {
    message: "Resetting a task cannot be combined with a title update.",
  });

export const planTaskIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid task id.");
