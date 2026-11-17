import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { dateForPlanDay, parseDateOnly } from "@/lib/plan-dates";
import { createPlanSchema } from "@/lib/validators/plans";
import { getCurrentUser } from "@/lib/auth";
import BusinessTemplate from "@/models/BusinessTemplate";
import PlanTask from "@/models/PlanTask";
import TemplateTask from "@/models/TemplateTask";
import UserPlan from "@/models/UserPlan";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid plan details." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(user.id);
    const { templateSlug } = parsed.data;
    const activePlanExists = await UserPlan.exists({ userId, templateSlug, status: "active" });
    if (activePlanExists) {
      return NextResponse.json({ error: "You already have an active plan for this business." }, { status: 409 });
    }

    const template = await BusinessTemplate.findOne({ slug: templateSlug }).lean().exec();
    if (!template) {
      return NextResponse.json({ error: "Business template not found." }, { status: 404 });
    }

    const templateTasks = await TemplateTask.find({ templateSlug }).sort({ day: 1 }).lean().exec();
    if (templateTasks.length !== 90 || templateTasks.some((task, index) => task.day !== index + 1)) {
      return NextResponse.json(
        { error: "This business plan is not fully imported yet. Import all 90 days and try again." },
        { status: 409 },
      );
    }

    const activePlanCount = await UserPlan.countDocuments({ userId, status: "active" });
    const startDate = parseDateOnly(parsed.data.startDate);
    const plan = await UserPlan.create({ userId, templateSlug, startDate, status: "active" });

    try {
      await PlanTask.insertMany(
        templateTasks.map((task) => ({
          planId: plan._id,
          userId,
          day: task.day,
          date: dateForPlanDay(startDate, task.day),
          phase: task.phase,
          title: task.title,
          isCustom: false,
          done: false,
          hoursSpent: 0,
          notes: "",
        })),
      );
    } catch (error) {
      await PlanTask.deleteMany({ planId: plan._id, userId });
      await UserPlan.deleteOne({ _id: plan._id, userId });
      throw error;
    }

    return NextResponse.json(
      {
        plan: {
          id: String(plan._id),
          templateSlug: plan.templateSlug,
          startDate: plan.startDate.toISOString(),
          status: plan.status,
        },
        taskCount: templateTasks.length,
        showFocusWarning: activePlanCount >= 3,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json({ error: "You already have an active plan for this business." }, { status: 409 });
    }

    console.error("Plan creation failed:", error);
    return NextResponse.json({ error: "Could not create the plan." }, { status: 500 });
  }
}
