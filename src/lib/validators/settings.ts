import { z } from "zod";

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  timezone: z.string().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid timezone."),
  monthlyIncomeGoal: z.number().min(0).max(100_000_000),
  dailyReminderTime: z.union([
    z.literal(""),
    z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Reminder time must use HH:MM."),
  ]),
}).strict();

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  message: "New password must be different from the current password.",
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
}).strict();
