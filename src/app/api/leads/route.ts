import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { dateKeyInTimezone, parseDateOnly } from "@/lib/plan-dates";
import { createLeadSchema, leadQuerySchema } from "@/lib/validators/leads";
import BusinessTemplate from "@/models/BusinessTemplate";
import Lead from "@/models/Lead";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

function isFollowUpDueToday(lead: { nextFollowUpDate: Date | null; status: string }, today: string) {
  return (
    lead.nextFollowUpDate?.toISOString().slice(0, 10) === today &&
    lead.status !== "won" &&
    lead.status !== "lost"
  );
}

export async function GET(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsedQuery = leadQuerySchema.safeParse(params);
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message ?? "Invalid lead filters." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const user = await User.findById(userId).select("timezone").lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (parsedQuery.data.planId && !(await UserPlan.exists({ _id: parsedQuery.data.planId, userId }))) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const timeZone = user.timezone || "Asia/Colombo";
    const today = dateKeyInTimezone(new Date(), timeZone);
    const allLeads = await Lead.find({ userId }).sort({ updatedAt: -1 }).lean().exec();
    const matchingLeads = allLeads.filter((lead) =>
      (!parsedQuery.data.planId || lead.planId.toString() === parsedQuery.data.planId) &&
      (!parsedQuery.data.platform || lead.platform === parsedQuery.data.platform)
    );
    const dueLeads = allLeads.filter((lead) => isFollowUpDueToday(lead, today));

    if (parsedQuery.data.countOnly === "true") {
      return NextResponse.json({ followUpsDueToday: dueLeads.length });
    }

    const plans = await UserPlan.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    const templates = await BusinessTemplate.find({
      slug: { $in: plans.map((plan) => plan.templateSlug) },
    }).select("slug name").lean().exec();
    const templateNames = new Map(templates.map((template) => [template.slug, template.name]));
    const contacted = matchingLeads.filter((lead) => lead.status !== "new").length;
    const replied = matchingLeads.filter((lead) =>
      ["replied", "proposal", "won", "lost"].includes(lead.status)
    ).length;
    const won = matchingLeads.filter((lead) => lead.status === "won").length;
    const pipelineValue = matchingLeads.reduce(
      (total, lead) => total + (["won", "lost"].includes(lead.status) ? 0 : lead.valueExpected),
      0,
    );

    return NextResponse.json({
      leads: matchingLeads.map((lead) => ({
        id: lead._id.toString(),
        planId: lead.planId.toString(),
        name: lead.name,
        platform: lead.platform,
        contact: lead.contact,
        status: lead.status,
        nextFollowUpDate: lead.nextFollowUpDate?.toISOString().slice(0, 10) ?? "",
        notes: lead.notes,
        valueExpected: lead.valueExpected,
      })),
      plans: plans.map((plan) => ({
        id: plan._id.toString(),
        name: templateNames.get(plan.templateSlug) ?? plan.templateSlug,
      })),
      followUps: dueLeads.map((lead) => ({
        id: lead._id.toString(),
        name: lead.name,
        nextFollowUpDate: lead.nextFollowUpDate?.toISOString().slice(0, 10) ?? "",
      })),
      today,
      summary: {
        total: matchingLeads.length,
        contacted,
        replyRate: contacted ? Math.round((replied / contacted) * 100) : 0,
        winRate: contacted ? Math.round((won / contacted) * 100) : 0,
        pipelineValue,
      },
    });
  } catch (error) {
    console.error("Leads query failed:", error);
    return NextResponse.json({ error: "Could not load leads." }, { status: 500 });
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
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid lead details." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = new mongoose.Types.ObjectId(sessionUser.id);
    const plan = await UserPlan.exists({ _id: parsed.data.planId, userId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const lead = await Lead.create({
      ...parsed.data,
      userId,
      planId: new mongoose.Types.ObjectId(parsed.data.planId),
      nextFollowUpDate: parsed.data.nextFollowUpDate ? parseDateOnly(parsed.data.nextFollowUpDate) : null,
    });
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
    }, { status: 201 });
  } catch (error) {
    console.error("Lead creation failed:", error);
    return NextResponse.json({ error: "Could not create this lead." }, { status: 500 });
  }
}
