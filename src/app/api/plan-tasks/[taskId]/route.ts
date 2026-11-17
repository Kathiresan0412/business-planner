import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { parseDateOnly } from "@/lib/plan-dates";
import { planTaskIdSchema, updatePlanTaskSchema } from "@/lib/validators/plan-tasks";
import PlanTask from "@/models/PlanTask";
import TemplateTask from "@/models/TemplateTask";
import UserPlan from "@/models/UserPlan";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { taskId: rawTaskId } = await params;
  const parsedId = planTaskIdSchema.safeParse(rawTaskId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updatePlanTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid task update." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(user.id);
    const task = await PlanTask.findOne({ _id: parsedId.data, userId }).exec();
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const changes = parsed.data;
    if (changes.resetToTemplate || changes.title !== undefined) {
      const plan = await UserPlan.findOne({ _id: task.planId, userId }).select("templateSlug").lean().exec();
      if (!plan) {
        return NextResponse.json({ error: "Plan not found." }, { status: 404 });
      }

      const templateTask = await TemplateTask.findOne({
        templateSlug: plan.templateSlug,
        day: task.day,
      }).lean().exec();
      if (!templateTask) {
        return NextResponse.json({ error: "Original task not found." }, { status: 404 });
      }

      if (changes.resetToTemplate) {
        task.title = templateTask.title;
        task.isCustom = false;
      } else if (changes.title !== undefined) {
        task.title = changes.title;
        task.isCustom = !templateTask.title.trim() && Boolean(changes.title);
      }
    }

    if (changes.done !== undefined) {
      task.done = changes.done;
      task.doneAt = changes.done ? new Date() : null;
    }
    if (changes.hoursSpent !== undefined) {
      task.hoursSpent = changes.hoursSpent;
    }
    if (changes.notes !== undefined) {
      task.notes = changes.notes;
    }
    if (changes.date !== undefined) {
      task.date = parseDateOnly(changes.date);
    }

    await task.save();
    return NextResponse.json({
      task: {
        id: String(task._id),
        day: task.day,
        date: task.date.toISOString().slice(0, 10),
        phase: task.phase,
        title: task.title,
        isCustom: task.isCustom,
        done: task.done,
        hoursSpent: task.hoursSpent,
        notes: task.notes,
        doneAt: task.doneAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Plan task update failed:", error);
    return NextResponse.json({ error: "Could not update the task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { taskId: rawTaskId } = await params;
  const parsedId = planTaskIdSchema.safeParse(rawTaskId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(user.id);
    const task = await PlanTask.findOne({ _id: parsedId.data, userId }).exec();
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    if (!task.isCustom) {
      return NextResponse.json({ error: "Only a custom task can be deleted." }, { status: 409 });
    }

    const plan = await UserPlan.findOne({ _id: task.planId, userId }).select("templateSlug").lean().exec();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const templateTask = await TemplateTask.findOne({
      templateSlug: plan.templateSlug,
      day: task.day,
    }).lean().exec();
    task.title = templateTask?.title ?? "";
    task.isCustom = false;
    task.done = false;
    task.doneAt = null;
    task.hoursSpent = 0;
    task.notes = "";
    await task.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Custom task deletion failed:", error);
    return NextResponse.json({ error: "Could not delete the task." }, { status: 500 });
  }
}
