import mongoose from "mongoose";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { TodayPlanCard, type TodayTask } from "@/components/today-plan-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectToDatabase } from "@/lib/db";
import { addDaysToDateKey, dateKeyInTimezone } from "@/lib/plan-dates";
import { getCurrentUser } from "@/lib/auth";
import BusinessTemplate from "@/models/BusinessTemplate";
import PlanTask from "@/models/PlanTask";
import User from "@/models/User";
import UserPlan from "@/models/UserPlan";

function TodayFallback() {
  return (
    <div aria-busy="true" className="space-y-5">
      {Array.from({ length: 2 }, (_, index) => (
        <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" key={index} />
      ))}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayFallback />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || !mongoose.isValidObjectId(sessionUser.id)) {
    redirect("/login");
  }

  await connectToDatabase();
  const userId = new mongoose.Types.ObjectId(sessionUser.id);
  const [user, plans] = await Promise.all([
    User.findOne({ _id: userId }).select("timezone").lean().exec(),
    UserPlan.find({ userId, status: "active" }).sort({ createdAt: -1 }).lean().exec(),
  ]);
  const timeZone = user?.timezone || "Asia/Colombo";
  const today = dateKeyInTimezone(new Date(), timeZone);
  const planIds = plans.map((plan) => plan._id);
  const templateSlugs = [...new Set(plans.map((plan) => plan.templateSlug))];
  const [templates, tasks] = await Promise.all([
    BusinessTemplate.find({ slug: { $in: templateSlugs } }).lean().exec(),
    PlanTask.find({ userId, planId: { $in: planIds } }).sort({ date: 1, day: 1 }).lean().exec(),
  ]);
  const templatesBySlug = new Map(templates.map((template) => [template.slug, template]));
  const tasksByPlan = new Map<string, TodayTask[]>();

  for (const task of tasks) {
    const planId = task.planId.toString();
    const planTasks = tasksByPlan.get(planId) ?? [];
    planTasks.push({
      id: task._id.toString(),
      day: task.day,
      date: task.date.toISOString().slice(0, 10),
      phase: task.phase,
      title: task.title,
      done: task.done,
      hoursSpent: task.hoursSpent,
      notes: task.notes,
      isCustom: task.isCustom,
    });
    tasksByPlan.set(planId, planTasks);
  }

  const planCards = plans.map((plan) => {
    const planId = plan._id.toString();
    const planTasks = tasksByPlan.get(planId) ?? [];
    const startDate = plan.startDate.toISOString().slice(0, 10);
    const endDate = addDaysToDateKey(startDate, 89);
    const currentDay = Math.floor(
      (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000,
    ) + 1;
    const todayTasks = planTasks.filter((task) => task.date === today);
    const missedTasks = planTasks.filter((task) => task.date < today && !task.done);
    const upcomingTasks = planTasks.filter((task) => task.date > today).slice(0, 3);
    const currentPhase =
      todayTasks.find((task) => task.day === currentDay)?.phase ??
      planTasks.find((task) => task.day === currentDay)?.phase ??
      "";
    const tasksByDate = new Map<string, TodayTask[]>();
    for (const task of planTasks) {
      const tasksForDate = tasksByDate.get(task.date) ?? [];
      tasksForDate.push(task);
      tasksByDate.set(task.date, tasksForDate);
    }

    let streak = 0;
    let streakDate = today;
    if (!tasksByDate.get(today)?.every((task) => task.done)) {
      streakDate = addDaysToDateKey(today, -1);
    }
    while (streakDate >= startDate && tasksByDate.get(streakDate)?.every((task) => task.done)) {
      streak += 1;
      streakDate = addDaysToDateKey(streakDate, -1);
    }

    const template = templatesBySlug.get(plan.templateSlug);
    return {
      planId,
      businessName: template?.name ?? plan.templateSlug,
      emoji: template?.emoji ?? "",
      today,
      startDate,
      endDate,
      currentDay,
      currentPhase,
      streak,
      todayTasks,
      missedTasks,
      upcomingTasks,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Today</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Your daily plan</h1>
      </div>

      {planCards.length ? (
        <div className="space-y-6">
          {planCards.map((plan) => <TodayPlanCard key={plan.planId} {...plan} />)}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No active plans yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Choose a business and start date to see your first task here.
            </p>
            <Link href="/dashboard">
              <Button>Choose a business</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
