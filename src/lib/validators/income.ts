import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid plan id.");
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date.");

export const incomeEntrySchema = z.object({
  amount: z.number().positive().max(100_000_000),
  source: z.string().trim().min(1).max(150),
  planId: objectIdSchema.optional(),
  date: dateOnlySchema,
  note: z.string().max(2000).default(""),
}).strict();

export const updateIncomeEntrySchema = z.object({
  amount: z.number().positive().max(100_000_000).optional(),
  source: z.string().trim().min(1).max(150).optional(),
  planId: objectIdSchema.nullable().optional(),
  date: dateOnlySchema.optional(),
  note: z.string().max(2000).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one income field to update.",
});

export const incomeQuerySchema = z.object({
  planId: objectIdSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "Start date must be on or before end date.",
});

export const monthlyGoalSchema = z.object({
  monthlyIncomeGoal: z.number().min(0).max(100_000_000),
}).strict();
