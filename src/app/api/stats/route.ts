import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { addDaysToDateKey, dateKeyInTimezone, parseDateOnly } from "@/lib/plan-dates";
import { planIdSchema } from "@/lib/validators/plans";
import { updateStatsSchema } from "@/lib/validators/stats";
import BusinessTemplate from "@/models/BusinessTemplate";
import IncomeEntry from "@/models/IncomeEntry";
import PlanTask from "@/models/PlanTask";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

export async function GET(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const requestedPlanId = new URL(request.url).searchParams.get("planId");
  if (requestedPlanId && !planIdSchema.safeParse(requestedPlanId).success) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const [user, activePlans] = await Promise.all([
      User.findOne({ _id: userId }).select("timezone weeklyIncomeTarget").lean().exec(),
      UserPlan.find({ userId, status: "active" }).sort({ createdAt: 1 }).lean().exec(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const selectedPlan = requestedPlanId
      ? activePlans.find((plan) => plan._id.toString() === requestedPlanId)
      : activePlans[0];
    if (requestedPlanId && !selectedPlan) {
      return NextResponse.json({ error: "Active plan not found." }, { status: 404 });
    }

    const timeZone = user.timezone || "Asia/Colombo";
    const today = dateKeyInTimezone(new Date(), timeZone);
    const todayDate = parseDateOnly(today);
    const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
    const weekStart = new Date(todayDate);
    weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);
    const monthStartKey = addDaysToDateKey(today, -29);
    const monthStart = parseDateOnly(monthStartKey);
    const planIds = activePlans.map((plan) => plan._id);
    const selectedPlanId = selectedPlan?._id ?? null;

    const [
      taskSummary,
      completedThisWeek,
      incomeSummary,
      dailyTaskRows,
      weeklyIncomeRows,
      phaseRows,
      completedDayRows,
      templates,
    ] = await Promise.all([
      PlanTask.aggregate<{
        _id: mongoose.Types.ObjectId;
        total: number;
        done: number;
        hours: number;
      }>([
        { $match: { userId, planId: { $in: planIds } } },
        {
          $group: {
            _id: "$planId",
            total: { $sum: 1 },
            done: { $sum: { $cond: ["$done", 1, 0] } },
            hours: { $sum: "$hoursSpent" },
          },
        },
      ]),
      PlanTask.countDocuments({
        userId,
        planId: { $in: planIds },
        done: true,
        date: { $gte: weekStart, $lte: todayDate },
      }),
      IncomeEntry.aggregate<{ total: number }>([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PlanTask.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            userId,
            planId: selectedPlanId ? selectedPlanId : { $in: planIds },
            done: true,
            date: { $gte: monthStart, $lte: todayDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" } },
            count: { $sum: 1 },
          },
        },
      ]),
      IncomeEntry.aggregate<{ _id: Date; total: number }>([
        {
          $match: {
            userId,
            ...(selectedPlanId ? { planId: selectedPlanId } : {}),
            date: { $gte: new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() - 2, 1)) },
          },
        },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: "$date",
                unit: "week",
                startOfWeek: "monday",
                timezone: timeZone,
              },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      selectedPlanId
        ? PlanTask.aggregate<{ _id: string; total: number; done: number }>([
            { $match: { userId, planId: selectedPlanId } },
            {
              $group: {
                _id: "$phase",
                total: { $sum: 1 },
                done: { $sum: { $cond: ["$done", 1, 0] } },
              },
            },
          ])
        : Promise.resolve([]),
      selectedPlanId
        ? PlanTask.aggregate<{ _id: string }>([
            {
              $match: {
                userId,
                planId: selectedPlanId,
                date: { $gte: parseDateOnly(addDaysToDateKey(today, -365)), $lte: todayDate },
              },
            },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" } },
                total: { $sum: 1 },
                done: { $sum: { $cond: ["$done", 1, 0] } },
              },
            },
            { $match: { $expr: { $eq: ["$total", "$done"] } } },
            { $sort: { _id: 1 } },
          ])
        : Promise.resolve([]),
      BusinessTemplate.find({ slug: { $in: activePlans.map((plan) => plan.templateSlug) } })
        .select("slug name")
        .lean()
        .exec(),
    ]);

    const summaryByPlan = new Map(taskSummary.map((summary) => [summary._id.toString(), summary]));
    const templateNames = new Map(templates.map((template) => [template.slug, template.name]));
    const progressPerPlan = activePlans.map((plan) => {
      const summary = summaryByPlan.get(plan._id.toString());
      const total = summary?.total ?? 0;
      const done = summary?.done ?? 0;
      return {
        id: plan._id.toString(),
        name: templateNames.get(plan.templateSlug) ?? plan.templateSlug,
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    });
    const dailyTaskCounts = new Map(dailyTaskRows.map((row) => [row._id, row.count]));
    const tasksByDay = Array.from({ length: 30 }, (_, index) => {
      const date = addDaysToDateKey(today, index - 29);
      return { date, count: dailyTaskCounts.get(date) ?? 0 };
    });

    const completedDates = new Set(completedDayRows.map((row) => row._id));
    let streak = 0;
    let streakDate = today;
    if (!completedDates.has(today)) {
      streakDate = addDaysToDateKey(today, -1);
    }
    while (completedDates.has(streakDate)) {
      streak += 1;
      streakDate = addDaysToDateKey(streakDate, -1);
    }

    const weeklyIncome = new Map(
      weeklyIncomeRows.map((row) => [dateKeyInTimezone(row._id, timeZone), row.total]),
    );
    const incomeByWeek = Array.from({ length: 9 }, (_, index) => {
      const week = new Date(todayDate);
      week.setUTCDate(week.getUTCDate() - mondayOffset - (8 - index) * 7);
      const date = week.toISOString().slice(0, 10);
      return { week: date, amount: weeklyIncome.get(date) ?? 0 };
    });
    const selectedSummary = selectedPlanId ? summaryByPlan.get(selectedPlanId.toString()) : undefined;

    return NextResponse.json({
      summary: {
        activePlans: activePlans.length,
        tasksDoneThisWeek: completedThisWeek,
        streak,
        totalIncome: incomeSummary[0]?.total ?? 0,
        totalHours: taskSummary.reduce((sum, item) => sum + item.hours, 0),
      },
      plans: activePlans.map((plan) => ({
        id: plan._id.toString(),
        name: templateNames.get(plan.templateSlug) ?? plan.templateSlug,
      })),
      selectedPlanId: selectedPlanId?.toString() ?? "",
      progressPerPlan,
      tasksByDay,
      incomeByWeek,
      weeklyIncomeTarget: user.weeklyIncomeTarget ?? 0,
      phaseCompletion: phaseRows.map((phase) => ({
        name: phase._id,
        total: phase.total,
        done: phase.done,
      })),
      selectedPlanProgress: selectedSummary
        ? {
            total: selectedSummary.total,
            done: selectedSummary.done,
          }
        : null,
    });
  } catch (error) {
    console.error("Dashboard stats query failed:", error);
    return NextResponse.json({ error: "Could not load dashboard statistics." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updateStatsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid dashboard setting." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(sessionUser.id) },
      { $set: { weeklyIncomeTarget: parsed.data.weeklyIncomeTarget } },
      { new: true, runValidators: true },
    )
      .select("weeklyIncomeTarget")
      .lean()
      .exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ weeklyIncomeTarget: user.weeklyIncomeTarget });
  } catch (error) {
    console.error("Dashboard target update failed:", error);
    return NextResponse.json({ error: "Could not update the weekly income target." }, { status: 500 });
  }
}
