import mongoose from "mongoose";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { StartPlanDialog } from "@/components/start-plan-dialog";
import { DashboardStats } from "@/components/dashboard-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import BusinessTemplate from "@/models/BusinessTemplate";
import UserPlan from "@/models/UserPlan";

function DashboardFallback() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" key={index} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user || !mongoose.isValidObjectId(user.id)) {
    redirect("/login");
  }

  await connectToDatabase();
  const userId = new mongoose.Types.ObjectId(user.id);
  const [templates, plans] = await Promise.all([
    BusinessTemplate.find({}).sort({ number: 1 }).lean().exec(),
    UserPlan.find({ userId }).sort({ createdAt: -1 }).lean().exec(),
  ]);
  const latestPlanByTemplate = new Map<string, (typeof plans)[number]>();
  for (const plan of plans) {
    if (!latestPlanByTemplate.has(plan.templateSlug)) {
      latestPlanByTemplate.set(plan.templateSlug, plan);
    }
  }

  const activePlanCount = plans.filter((plan) => plan.status === "active").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Overview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose your next 90 days</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Start with one business idea, or continue a plan you already began.
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {activePlanCount} active {activePlanCount === 1 ? "plan" : "plans"}
        </p>
      </div>

      {activePlanCount >= 3 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Focus beats spreading thin. You already have {activePlanCount} active plans.
        </div>
      ) : null}

      <DashboardStats />

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your business templates are not loaded yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>Add the workbook at data/Full_90Day_Business_Plan.xlsx, then run:</p>
            <pre className="overflow-x-auto rounded-md bg-slate-100 p-3 dark:bg-slate-900">
              npm run export:excel{"\n"}npm run seed
            </pre>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const existingPlan = latestPlanByTemplate.get(template.slug);

            return (
              <Card className="h-full" key={template.slug}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-3xl">{template.emoji || "💼"}</span>
                    <div className="space-y-1">
                      <CardTitle>{template.name}</CardTitle>
                      <p className="text-sm text-slate-500">{template.investment}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Income potential:</span> {template.incomePotential}</p>
                    <p><span className="font-medium">First income:</span> around day {template.daysToFirstIncome}</p>
                  </div>
                  <div className="mt-auto">
                    {existingPlan ? (
                      <Link className="block" href={`/plan/${existingPlan._id.toString()}`}>
                        <Button className="w-full" variant="outline">
                          {existingPlan.status === "completed" ? "View plan" : "Continue"}
                        </Button>
                      </Link>
                    ) : (
                      <StartPlanDialog
                        businessName={template.name}
                        templateSlug={template.slug}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
