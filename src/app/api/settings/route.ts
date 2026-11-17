import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { settingsSchema } from "@/lib/validators/settings";
import User from "@/models/User";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(sessionUser.id)
      .select("name email timezone monthlyIncomeGoal dailyReminderTime")
      .lean()
      .exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({
      name: user.name,
      email: user.email,
      timezone: user.timezone || "Asia/Colombo",
      monthlyIncomeGoal: user.monthlyIncomeGoal ?? 0,
      dailyReminderTime: user.dailyReminderTime ?? "",
    });
  } catch (error) {
    console.error("Settings query failed:", error);
    return NextResponse.json({ error: "Could not load settings." }, { status: 500 });
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
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(sessionUser.id) },
      { $set: parsed.data },
      { new: true, runValidators: true },
    ).select("name email timezone monthlyIncomeGoal dailyReminderTime").lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({
      name: user.name,
      email: user.email,
      timezone: user.timezone || "Asia/Colombo",
      monthlyIncomeGoal: user.monthlyIncomeGoal ?? 0,
      dailyReminderTime: user.dailyReminderTime ?? "",
    });
  } catch (error) {
    console.error("Settings update failed:", error);
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
}
