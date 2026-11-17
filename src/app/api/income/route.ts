import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { dateKeyInTimezone, parseDateOnly } from "@/lib/plan-dates";
import {
  incomeEntrySchema,
  incomeQuerySchema,
  monthlyGoalSchema,
} from "@/lib/validators/income";
import BusinessTemplate from "@/models/BusinessTemplate";
import IncomeEntry from "@/models/IncomeEntry";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

function isOwnedPlanId(value: string) {
  return mongoose.isValidObjectId(value);
}

export async function GET(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsedQuery = incomeQuerySchema.safeParse(params);
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message ?? "Invalid income filters." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const user = await User.findOne({ _id: userId }).select("timezone monthlyIncomeGoal").lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const match: Record<string, unknown> = { userId };
    if (parsedQuery.data.planId) {
      if (!isOwnedPlanId(parsedQuery.data.planId)) {
        return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
      }
      const planExists = await UserPlan.exists({ _id: parsedQuery.data.planId, userId });
      if (!planExists) {
        return NextResponse.json({ error: "Plan not found." }, { status: 404 });
      }
      match.planId = new mongoose.Types.ObjectId(parsedQuery.data.planId);
    }
    if (parsedQuery.data.from || parsedQuery.data.to) {
      match.date = {
        ...(parsedQuery.data.from ? { $gte: parseDateOnly(parsedQuery.data.from) } : {}),
        ...(parsedQuery.data.to ? { $lte: parseDateOnly(parsedQuery.data.to) } : {}),
      };
    }

    const [entries, plans, allTimeRows, monthlyRows] = await Promise.all([
      IncomeEntry.find(match).sort({ date: -1, createdAt: -1 }).lean().exec(),
      UserPlan.find({ userId }).sort({ createdAt: -1 }).lean().exec(),
      IncomeEntry.aggregate<{ total: number }>([
        { $match: { userId, ...(parsedQuery.data.planId ? { planId: match.planId } : {}) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      IncomeEntry.aggregate<{ _id: string; total: number }>([
        { $match: { userId, ...(parsedQuery.data.planId ? { planId: match.planId } : {}) } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: "$date",
                timezone: user.timezone || "Asia/Colombo",
              },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const planIds = plans.map((plan) => plan._id);
    const planIncomeFirsts = await IncomeEntry.aggregate<{ _id: mongoose.Types.ObjectId; firstIncome: Date }>([
      { $match: { userId, planId: { $in: planIds } } },
      { $group: { _id: "$planId", firstIncome: { $min: "$date" } } },
    ]);
    const templates = await BusinessTemplate.find({
      slug: { $in: plans.map((plan) => plan.templateSlug) },
    }).select("slug name daysToFirstIncome").lean().exec();
    const templatesBySlug = new Map(templates.map((template) => [template.slug, template]));
    const firstIncomeByPlan = new Map(planIncomeFirsts.map((row) => [row._id.toString(), row.firstIncome]));
    const daysToFirstIncome = plans.flatMap((plan) => {
      const firstIncome = firstIncomeByPlan.get(plan._id.toString());
      if (!firstIncome) return [];
      const actualDays = Math.max(
        0,
        Math.floor((firstIncome.getTime() - plan.startDate.getTime()) / 86400000),
      );
      const template = templatesBySlug.get(plan.templateSlug);
      return [{
        planId: plan._id.toString(),
        businessName: template?.name ?? plan.templateSlug,
        actualDays,
        expectedDays: template?.daysToFirstIncome ?? 0,
      }];
    });

    const now = new Date();
    const timeZone = user.timezone || "Asia/Colombo";
    const currentMonthKey = dateKeyInTimezone(now, timeZone).slice(0, 7);
    const currentMonthTotal = monthlyRows.find((row) => row._id === currentMonthKey)?.total ?? 0;
    const [currentYear, currentMonth] = currentMonthKey.split("-").map(Number);
    const lastMonthKey = new Date(Date.UTC(currentYear, currentMonth - 2, 1)).toISOString().slice(0, 7);

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry._id.toString(),
        amount: entry.amount,
        source: entry.source,
        planId: entry.planId?.toString() ?? "",
        date: entry.date.toISOString().slice(0, 10),
        note: entry.note,
      })),
      plans: plans.map((plan) => ({
        id: plan._id.toString(),
        templateSlug: plan.templateSlug,
        name: templatesBySlug.get(plan.templateSlug)?.name ?? plan.templateSlug,
      })),
      summary: {
        thisMonth: currentMonthTotal,
        lastMonth: monthlyRows.find((row) => row._id === lastMonthKey)?.total ?? 0,
        allTime: allTimeRows[0]?.total ?? 0,
        bestMonth: monthlyRows.reduce((best, row) => Math.max(best, row.total), 0),
        monthlyIncomeGoal: user.monthlyIncomeGoal ?? 0,
      },
      daysToFirstIncome,
    });
  } catch (error) {
    console.error("Income entries query failed:", error);
    return NextResponse.json({ error: "Could not load income data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
  const parsed = incomeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid income entry." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    if (parsed.data.planId && !(await UserPlan.exists({ _id: parsed.data.planId, userId }))) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const entry = await IncomeEntry.create({
      userId,
      planId: parsed.data.planId ? new mongoose.Types.ObjectId(parsed.data.planId) : undefined,
      amount: parsed.data.amount,
      source: parsed.data.source,
      date: parseDateOnly(parsed.data.date),
      note: parsed.data.note,
    });

    return NextResponse.json(
      {
        entry: {
          id: String(entry._id),
          amount: entry.amount,
          source: entry.source,
          planId: entry.planId?.toString() ?? "",
          date: entry.date.toISOString().slice(0, 10),
          note: entry.note,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Income entry creation failed:", error);
    return NextResponse.json({ error: "Could not create income entry." }, { status: 500 });
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
  const parsed = monthlyGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid monthly goal." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(sessionUser.id) },
      { $set: { monthlyIncomeGoal: parsed.data.monthlyIncomeGoal } },
      { new: true, runValidators: true },
    ).select("monthlyIncomeGoal").lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ monthlyIncomeGoal: user.monthlyIncomeGoal });
  } catch (error) {
    console.error("Monthly income goal update failed:", error);
    return NextResponse.json({ error: "Could not save your monthly goal." }, { status: 500 });
  }
}
