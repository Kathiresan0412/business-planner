import mongoose from "mongoose";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PlanDetailClient, type PlanDetailTask } from "@/components/plan-detail-client";
import { connectToDatabase } from "@/lib/db";
import { formatLkrText } from "@/lib/currency";
import { addDaysToDateKey, dateKeyInTimezone } from "@/lib/plan-dates";
import { getCurrentUser } from "@/lib/auth";
import { planIdSchema } from "@/lib/validators/plans";
import BusinessTemplate from "@/models/BusinessTemplate";
import IncomeEntry from "@/models/IncomeEntry";
import PlanTask from "@/models/PlanTask";
import TemplateTask from "@/models/TemplateTask";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

type RouteProps = { params: Promise<{ planId: string }> };

function PlanDetailFallback() {
  return (
    <div aria-busy="true" className="space-y-5">
      <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-[600px] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default function PlanPage({ params }: RouteProps) {
  return (
    <Suspense fallback={<PlanDetailFallback />}>
      <PlanDetail params={params} />
    </Suspense>
  );
}

async function PlanDetail({ params }: RouteProps) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    redirect("/login");
  }

  const { planId: rawPlanId } = await params;
  const parsedPlanId = planIdSchema.safeParse(rawPlanId);
  if (!parsedPlanId.success) {
    notFound();
  }

  await connectToDatabase();
  const userId = new mongoose.Types.ObjectId(sessionUser.id);
  const planObjectId = new mongoose.Types.ObjectId(parsedPlanId.data);
  const plan = await UserPlan.findOne({ _id: planObjectId, userId }).lean().exec();
  if (!plan) {
    notFound();
  }

  const [template, user, planTasks, templateTasks, incomeResult] = await Promise.all([
    BusinessTemplate.findOne({ slug: plan.templateSlug }).lean().exec(),
    User.findOne({ _id: userId }).select("timezone").lean().exec(),
    PlanTask.find({ planId: planObjectId, userId }).sort({ day: 1 }).lean().exec(),
    TemplateTask.find({ templateSlug: plan.templateSlug }).lean().exec(),
    IncomeEntry.aggregate<{ total: number }>([
      { $match: { userId, planId: planObjectId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  const templateTasksByDay = new Map(templateTasks.map((task) => [task.day, task]));
  const tasks: PlanDetailTask[] = planTasks.map((task) => ({
    id: task._id.toString(),
    day: task.day,
    date: task.date.toISOString().slice(0, 10),
    phase: task.phase,
    title: formatLkrText(task.title),
    originalTitle: formatLkrText(templateTasksByDay.get(task.day)?.title ?? ""),
    isCustom: task.isCustom,
    done: task.done,
    hoursSpent: task.hoursSpent,
    notes: task.notes,
  }));
  const startDate = plan.startDate.toISOString().slice(0, 10);
  const endDate = addDaysToDateKey(startDate, 89);
  const today = dateKeyInTimezone(new Date(), user?.timezone || "Asia/Colombo");

  return (
    <PlanDetailClient
      businessName={template?.name ?? plan.templateSlug}
      emoji={template?.emoji ?? ""}
      endDate={endDate}
      planId={planObjectId.toString()}
      startDate={startDate}
      status={plan.status}
      tasks={tasks}
      today={today}
      totalIncome={incomeResult[0]?.total ?? 0}
    />
  );
}
