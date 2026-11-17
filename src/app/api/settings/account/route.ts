import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { deleteAccountSchema } from "@/lib/validators/settings";
import IncomeEntry from "@/models/IncomeEntry";
import Lead from "@/models/Lead";
import PlanTask from "@/models/PlanTask";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

export async function DELETE(request: Request) {
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
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Type DELETE to confirm account removal." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const session = await mongoose.startSession();
    let accountDeleted = false;
    try {
      await session.withTransaction(async () => {
        if (!(await User.exists({ _id: userId }).session(session))) return;
        await PlanTask.deleteMany({ userId }, { session });
        await UserPlan.deleteMany({ userId }, { session });
        await IncomeEntry.deleteMany({ userId }, { session });
        await Lead.deleteMany({ userId }, { session });
        const result = await User.deleteOne({ _id: userId }, { session });
        accountDeleted = result.deletedCount > 0;
      });
    } finally {
      await session.endSession();
    }
    if (!accountDeleted) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Could not delete the account and its data." }, { status: 500 });
  }
}
