import { z } from "zod";

export const updateStatsSchema = z.object({
  weeklyIncomeTarget: z.number().min(0).max(100_000_000),
}).strict();
