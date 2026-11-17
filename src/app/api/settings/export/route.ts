import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import IncomeEntry from "@/models/IncomeEntry";
import Lead from "@/models/Lead";
import PlanTask from "@/models/PlanTask";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const [user, plans, tasks, income, leads] = await Promise.all([
      User.findById(userId).select("name email timezone monthlyIncomeGoal dailyReminderTime").lean().exec(),
      UserPlan.find({ userId }).lean().exec(),
      PlanTask.find({ userId }).lean().exec(),
      IncomeEntry.find({ userId }).lean().exec(),
      Lead.find({ userId }).lean().exec(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      plans,
      tasks,
      income,
      leads,
      reviews: [],
    };
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="business-planner-export.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Data export failed:", error);
    return NextResponse.json({ error: "Could not export your data." }, { status: 500 });
  }
}
