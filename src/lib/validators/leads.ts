import { z } from "zod";

import { leadPlatforms, leadStatuses } from "@/lib/lead-options";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid plan id.");
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date.");

const leadFields = {
  planId: objectIdSchema,
  name: z.string().trim().min(1).max(150),
  platform: z.enum(leadPlatforms),
  contact: z.string().trim().max(250).default(""),
  status: z.enum(leadStatuses).default("new"),
  nextFollowUpDate: dateOnlySchema.nullable().optional(),
  notes: z.string().max(2000).default(""),
  valueExpected: z.number().min(0).max(100_000_000).default(0),
};

export const createLeadSchema = z.object(leadFields).strict();

export const updateLeadSchema = z.object({
  planId: objectIdSchema.optional(),
  name: leadFields.name.optional(),
  platform: leadFields.platform.optional(),
  contact: leadFields.contact.optional(),
  status: leadFields.status.optional(),
  nextFollowUpDate: dateOnlySchema.nullable().optional(),
  notes: leadFields.notes.optional(),
  valueExpected: leadFields.valueExpected.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one lead field to update.",
});

export const leadQuerySchema = z.object({
  planId: objectIdSchema.optional(),
  platform: z.enum(leadPlatforms).optional(),
  countOnly: z.enum(["true", "false"]).optional(),
}).strict();
