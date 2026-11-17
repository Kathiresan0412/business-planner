import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "../src/lib/db";
import BusinessTemplate from "../src/models/BusinessTemplate";
import TemplateTask from "../src/models/TemplateTask";

const PHASES = [
  "Research & Setup",
  "Build Presence",
  "First Samples/Launch",
  "Active Outreach",
  "First Customer",
  "Iterate & Improve",
  "Scale & Systems",
] as const;

const templateSchema = z.object({
  slug: z.string().min(1),
  number: z.number().int().min(1).max(10),
  name: z.string().min(1),
  investment: z.string(),
  incomePotential: z.string(),
  daysToFirstIncome: z.number().int().nonnegative(),
  sheetName: z.string().min(1),
  description: z.string().optional(),
  emoji: z.string().optional(),
}).strict();

const taskSchema = z.object({
  templateSlug: z.string().min(1),
  day: z.number().int().min(1).max(90),
  phase: z.enum(PHASES),
  title: z.string(),
  defaultHours: z.number().nonnegative(),
}).strict();

async function readJsonFile(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as unknown;
}

async function main() {
  const templatesResult = z.array(templateSchema).length(10).safeParse(await readJsonFile("templates.json"));
  if (!templatesResult.success) {
    throw new Error(`data/templates.json is invalid: ${templatesResult.error.issues[0]?.message}`);
  }

  const tasksResult = z.array(taskSchema).safeParse(await readJsonFile("tasks.json"));
  if (!tasksResult.success) {
    throw new Error(`data/tasks.json is invalid: ${tasksResult.error.issues[0]?.message}`);
  }

  const templates = templatesResult.data;
  const tasks = tasksResult.data;
  const templateSlugs = new Set(templates.map((template) => template.slug));
  const taskKeys = new Set<string>();

  for (const task of tasks) {
    if (!templateSlugs.has(task.templateSlug)) {
      throw new Error(`Task references unknown template "${task.templateSlug}".`);
    }

    const key = `${task.templateSlug}:${task.day}`;
    if (taskKeys.has(key)) {
      throw new Error(`Duplicate task found for ${key}.`);
    }
    taskKeys.add(key);
  }

  let connected = false;
  try {
    await connectToDatabase();
    connected = true;

    const templatesResult = await BusinessTemplate.bulkWrite(
      templates.map((template) => ({
        updateOne: {
          filter: { slug: template.slug },
          update: { $set: template },
          upsert: true,
        },
      })),
    );

    const tasksResult = await TemplateTask.bulkWrite(
      tasks.map((task) => ({
        updateOne: {
          filter: { templateSlug: task.templateSlug, day: task.day },
          update: { $set: task },
          upsert: true,
        },
      })),
    );

    console.log(
      `Seed complete: ${templates.length} templates and ${tasks.length} tasks processed ` +
        `(${templatesResult.upsertedCount} templates and ${tasksResult.upsertedCount} new records).`,
    );
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
