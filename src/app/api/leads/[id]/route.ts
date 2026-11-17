import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { parseDateOnly } from "@/lib/plan-dates";
import { updateLeadSchema } from "@/lib/validators/leads";
import Lead from "@/models/Lead";
import UserPlan from "@/models/UserPlan";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid lead update." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    if (parsed.data.planId && !(await UserPlan.exists({ _id: parsed.data.planId, userId }))) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const lead = await Lead.findOne({ _id: id, userId }).exec();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    if (parsed.data.planId !== undefined) lead.planId = new mongoose.Types.ObjectId(parsed.data.planId);
    if (parsed.data.name !== undefined) lead.name = parsed.data.name;
    if (parsed.data.platform !== undefined) lead.platform = parsed.data.platform;
    if (parsed.data.contact !== undefined) lead.contact = parsed.data.contact;
    if (parsed.data.status !== undefined) lead.status = parsed.data.status;
    if (parsed.data.nextFollowUpDate !== undefined) {
      lead.nextFollowUpDate = parsed.data.nextFollowUpDate
        ? parseDateOnly(parsed.data.nextFollowUpDate)
        : null;
    }
    if (parsed.data.notes !== undefined) lead.notes = parsed.data.notes;
    if (parsed.data.valueExpected !== undefined) lead.valueExpected = parsed.data.valueExpected;
    await lead.save();

    return NextResponse.json({
      lead: {
        id: lead._id.toString(),
        planId: lead.planId.toString(),
        name: lead.name,
        platform: lead.platform,
        contact: lead.contact,
        status: lead.status,
        nextFollowUpDate: lead.nextFollowUpDate?.toISOString().slice(0, 10) ?? "",
        notes: lead.notes,
        valueExpected: lead.valueExpected,
      },
    });
  } catch (error) {
    console.error("Lead update failed:", error);
    return NextResponse.json({ error: "Could not update this lead." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await Lead.deleteOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(sessionUser.id),
    });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead deletion failed:", error);
    return NextResponse.json({ error: "Could not delete this lead." }, { status: 500 });
  }
}
