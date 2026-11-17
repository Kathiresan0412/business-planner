import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { dateForPlanDay, parseDateOnly } from "@/lib/plan-dates";
import { getCurrentUser } from "@/lib/auth";
import { planIdSchema, updatePlanSchema } from "@/lib/validators/plans";
import PlanTask from "@/models/PlanTask";
import UserPlan from "@/models/UserPlan";

type RouteContext = { params: Promise<{ planId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { planId: rawPlanId } = await params;
  const parsedId = planIdSchema.safeParse(rawPlanId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid plan update." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(user.id);
    const plan = await UserPlan.findOne({ _id: parsedId.data, userId }).exec();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    if (parsed.data.status === "active" && plan.status !== "active") {
      const activePlanExists = await UserPlan.exists({
        _id: { $ne: plan._id },
        userId,
        templateSlug: plan.templateSlug,
        status: "active",
      });
      if (activePlanExists) {
        return NextResponse.json({ error: "You already have an active plan for this business." }, { status: 409 });
      }
    }

    const newStartDate = parsed.data.startDate ? parseDateOnly(parsed.data.startDate) : null;
    if (newStartDate) {
      const tasks = await PlanTask.find({ planId: plan._id, userId }).select("_id day").lean().exec();
      if (tasks.length) {
        await PlanTask.bulkWrite(
          tasks.map((task) => ({
            updateOne: {
              filter: { _id: task._id, planId: plan._id, userId },
              update: { $set: { date: dateForPlanDay(newStartDate, task.day) } },
            },
          })),
        );
      }
      plan.startDate = newStartDate;
    }

    if (parsed.data.status) {
      plan.status = parsed.data.status;
    }

    await plan.save();

    return NextResponse.json({
      plan: {
        id: String(plan._id),
        templateSlug: plan.templateSlug,
        startDate: plan.startDate.toISOString(),
        status: plan.status,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json({ error: "You already have an active plan for this business." }, { status: 409 });
    }

    console.error("Plan update failed:", error);
    return NextResponse.json({ error: "Could not update the plan." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { planId: rawPlanId } = await params;
  const parsedId = planIdSchema.safeParse(rawPlanId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(user.id);
    const plan = await UserPlan.findOne({ _id: parsedId.data, userId }).select("_id").lean().exec();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    await PlanTask.deleteMany({ planId: plan._id, userId });
    await UserPlan.deleteOne({ _id: plan._id, userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Plan deletion failed:", error);
    return NextResponse.json({ error: "Could not delete the plan." }, { status: 500 });
  }
}
