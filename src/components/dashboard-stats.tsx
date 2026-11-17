"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DashboardStatsData = {
  summary: {
    activePlans: number;
    tasksDoneThisWeek: number;
    streak: number;
    totalIncome: number;
    totalHours: number;
  };
  plans: Array<{ id: string; name: string }>;
  selectedPlanId: string;
  progressPerPlan: Array<{ id: string; name: string; progress: number }>;
  tasksByDay: Array<{ date: string; count: number }>;
  incomeByWeek: Array<{ week: string; amount: number }>;
  weeklyIncomeTarget: number;
  phaseCompletion: Array<{ name: string; total: number; done: number }>;
  selectedPlanProgress: { total: number; done: number } | null;
};

const PHASE_COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#6d28d9", "#5b21b6", "#4c1d95"];

const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function DashboardStats() {
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = selectedPlanId ? `?planId=${encodeURIComponent(selectedPlanId)}` : "";

    async function loadStats() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/stats${query}`, { signal: controller.signal });
        const result = (await response.json()) as DashboardStatsData | { error?: string };
        if (!response.ok || !("summary" in result)) {
          throw new Error("error" in result ? result.error ?? "Could not load dashboard statistics." : "Could not load dashboard statistics.");
        }

        setStats(result);
        setWeeklyTarget(String(result.weeklyIncomeTarget));
        if (!selectedPlanId && result.selectedPlanId) {
          setSelectedPlanId(result.selectedPlanId);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load dashboard statistics.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadStats();
    return () => controller.abort();
  }, [selectedPlanId]);

  async function saveWeeklyTarget() {
    const target = Number(weeklyTarget);
    if (!Number.isFinite(target) || target < 0 || target > 100_000_000) {
      setError("Enter a weekly target between ₹0 and ₹100,000,000.");
      return;
    }

    setSavingTarget(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyIncomeTarget: target }),
      });
      const result = (await response.json()) as { weeklyIncomeTarget?: number; error?: string };
      const savedTarget = result.weeklyIncomeTarget;
      if (!response.ok || savedTarget === undefined) {
        throw new Error(result.error ?? "Could not save your weekly target.");
      }
      setStats((current) => current ? { ...current, weeklyIncomeTarget: savedTarget } : current);
      setNotice("Weekly income target saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your weekly target.");
    } finally {
      setSavingTarget(false);
    }
  }

  const progressData =
    stats?.progressPerPlan.filter((plan) => !selectedPlanId || plan.id === selectedPlanId) ?? [];
  const phaseData = stats?.phaseCompletion.map((phase) => ({
    ...phase,
    pending: phase.total - phase.done,
  })) ?? [];
  const incomeData = stats?.incomeByWeek.map((week) => ({
    ...week,
    target: stats.weeklyIncomeTarget,
  })) ?? [];

  return (
    <section aria-label="Progress dashboard" className="space-y-5">
      {error ? <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
      {notice ? <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Active plans", value: stats?.summary.activePlans ?? 0 },
          { label: "Tasks done this week", value: stats?.summary.tasksDoneThisWeek ?? 0 },
          { label: "Current streak", value: `${stats?.summary.streak ?? 0} days` },
          { label: "Total income", value: formatRupees(stats?.summary.totalIncome ?? 0) },
          { label: "Total hours", value: `${stats?.summary.totalHours ?? 0}h` },
        ].map((stat) => (
          <Card aria-busy={loading} key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{loading ? "—" : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="stats-plan">Filter charts by plan</label>
          <select
            className="h-9 min-w-56 rounded-md border border-slate-300 bg-background px-3 text-sm dark:border-slate-700"
            id="stats-plan"
            onChange={(event) => setSelectedPlanId(event.target.value)}
            value={selectedPlanId}
          >
            <option value="">All active plans</option>
            {stats?.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="weekly-income-target">Weekly income target (₹)</label>
            <Input
              id="weekly-income-target"
              max={100_000_000}
              min={0}
              onChange={(event) => setWeeklyTarget(event.target.value)}
              type="number"
              value={weeklyTarget}
            />
          </div>
          <Button disabled={savingTarget || loading} onClick={() => void saveWeeklyTarget()} variant="outline">
            {savingTarget ? "Saving..." : "Save target"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Plan progress</CardTitle></CardHeader>
          <CardContent className="h-72">
            {loading ? <ChartPlaceholder /> : progressData.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={progressData} layout="vertical" margin={{ left: 16, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} type="number" />
                  <YAxis dataKey="name" type="category" width={130} />
                  <Tooltip formatter={(value) => [`${value}%`, "Complete"]} />
                  <Bar dataKey="progress" fill="#7c3aed" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tasks completed per day</CardTitle></CardHeader>
          <CardContent className="h-72">
            {loading ? <ChartPlaceholder /> : stats?.tasksByDay.some((day) => day.count) ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={stats.tasksByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Income per week</CardTitle></CardHeader>
          <CardContent className="h-72">
            {loading ? <ChartPlaceholder /> : incomeData.some((week) => week.amount) ? (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickFormatter={(value: string) => value.slice(5)} />
                  <YAxis tickFormatter={(value: number) => `₹${value}`} />
                  <Tooltip formatter={(value) => [formatRupees(Number(value)), "Income"]} />
                  <Line dataKey="amount" name="Income" stroke="#7c3aed" strokeWidth={2} type="monotone" />
                  <Line dataKey="target" name="Weekly target" stroke="#94a3b8" strokeDasharray="5 5" type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Phase completion</CardTitle></CardHeader>
          <CardContent className="h-72">
            {loading ? <ChartPlaceholder /> : phaseData.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie data={phaseData} dataKey="done" nameKey="name" outerRadius={90} label>
                    {phaseData.map((phase, index) => (
                      <Cell fill={PHASE_COLORS[index % PHASE_COLORS.length]} key={phase.name} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
      Complete your first task or log income to see your chart.
    </div>
  );
}

function ChartPlaceholder() {
  return <div aria-hidden="true" className="h-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />;
}
