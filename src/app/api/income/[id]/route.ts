import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { parseDateOnly } from "@/lib/plan-dates";
import { updateIncomeEntrySchema } from "@/lib/validators/income";
import IncomeEntry from "@/models/IncomeEntry";
import UserPlan from "@/models/UserPlan";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid income entry id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = updateIncomeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid income update." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const entry = await IncomeEntry.findOne({ _id: id, userId }).exec();
    if (!entry) {
      return NextResponse.json({ error: "Income entry not found." }, { status: 404 });
    }
    if (parsed.data.planId && !(await UserPlan.exists({ _id: parsed.data.planId, userId }))) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    if (parsed.data.amount !== undefined) entry.amount = parsed.data.amount;
    if (parsed.data.source !== undefined) entry.source = parsed.data.source;
    if (parsed.data.planId !== undefined) {
      entry.planId = parsed.data.planId ? new mongoose.Types.ObjectId(parsed.data.planId) : undefined;
    }
    if (parsed.data.date !== undefined) entry.date = parseDateOnly(parsed.data.date);
    if (parsed.data.note !== undefined) entry.note = parsed.data.note;
    await entry.save();

    return NextResponse.json({
      entry: {
        id: String(entry._id),
        amount: entry.amount,
        source: entry.source,
        planId: entry.planId?.toString() ?? "",
        date: entry.date.toISOString().slice(0, 10),
        note: entry.note,
      },
    });
  } catch (error) {
    console.error("Income entry update failed:", error);
    return NextResponse.json({ error: "Could not update income entry." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid income entry id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await IncomeEntry.deleteOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(sessionUser.id),
    });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Income entry not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Income entry deletion failed:", error);
    return NextResponse.json({ error: "Could not delete income entry." }, { status: 500 });
  }
}
