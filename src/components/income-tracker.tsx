"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type IncomeEntry = {
  id: string;
  amount: number;
  source: string;
  planId: string;
  date: string;
  note: string;
};

type IncomeResponse = {
  entries: IncomeEntry[];
  plans: Array<{ id: string; templateSlug: string; name: string }>;
  summary: {
    thisMonth: number;
    lastMonth: number;
    allTime: number;
    bestMonth: number;
    monthlyIncomeGoal: number;
  };
  daysToFirstIncome: Array<{
    planId: string;
    businessName: string;
    actualDays: number;
    expectedDays: number;
  }>;
};

function todayInPlannerTimezone() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function IncomeTracker() {
  const [data, setData] = useState<IncomeResponse | null>(null);
  const [planFilter, setPlanFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [planId, setPlanId] = useState("");
  const [date, setDate] = useState(todayInPlannerTimezone);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (planFilter) query.set("planId", planFilter);
    if (fromFilter) query.set("from", fromFilter);
    if (toFilter) query.set("to", toFilter);

    async function loadIncome() {
      setLoading(true);
      setError("");
      try {
        const suffix = query.size ? `?${query.toString()}` : "";
        const response = await fetch(`/api/income${suffix}`, { signal: controller.signal });
        const result = (await response.json()) as IncomeResponse | { error?: string };
        if (!response.ok || !("entries" in result)) {
          throw new Error("error" in result ? result.error ?? "Could not load income data." : "Could not load income data.");
        }
        setData(result);
        setMonthlyGoal(String(result.summary.monthlyIncomeGoal));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load income data.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadIncome();
    return () => controller.abort();
  }, [planFilter, fromFilter, toFilter]);

  function clearForm() {
    setAmount("");
    setSource("");
    setPlanId("");
    setDate(todayInPlannerTimezone());
    setNote("");
    setEditingId("");
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      amount: Number(amount),
      source,
      ...(planId ? { planId } : {}),
      date,
      note,
    };

    try {
      const response = await fetch(editingId ? `/api/income/${editingId}` : "/api/income", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not save this income entry.");
      }
      clearForm();
      setNotice(editingId ? "Income entry updated." : "Income entry added.");
      const query = new URLSearchParams();
      if (planFilter) query.set("planId", planFilter);
      if (fromFilter) query.set("from", fromFilter);
      if (toFilter) query.set("to", toFilter);
      const suffix = query.size ? `?${query.toString()}` : "";
      const refreshed = await fetch(`/api/income${suffix}`);
      const refreshedData = (await refreshed.json()) as IncomeResponse | { error?: string };
      if (!refreshed.ok || !("entries" in refreshedData)) {
        throw new Error("error" in refreshedData ? refreshedData.error ?? "Could not reload income data." : "Could not reload income data.");
      }
      setData(refreshedData);
      setMonthlyGoal(String(refreshedData.summary.monthlyIncomeGoal));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this income entry.");
    } finally {
      setSaving(false);
    }
  }

  function editEntry(entry: IncomeEntry) {
    setEditingId(entry.id);
    setAmount(String(entry.amount));
    setSource(entry.source);
    setPlanId(entry.planId);
    setDate(entry.date);
    setNote(entry.note);
    setNotice("");
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this income entry?")) return;
    setError("");
    try {
      const response = await fetch(`/api/income/${id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not delete this income entry.");
      setData((current) => current ? { ...current, entries: current.entries.filter((entry) => entry.id !== id) } : current);
      setNotice("Income entry deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this income entry.");
    }
  }

  async function saveMonthlyGoal() {
    const goal = Number(monthlyGoal);
    if (!Number.isFinite(goal) || goal < 0 || goal > 100_000_000) {
      setError("Enter a monthly goal between ₹0 and ₹100,000,000.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/income", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncomeGoal: goal }),
      });
      const result = (await response.json()) as { monthlyIncomeGoal?: number; error?: string };
      const savedGoal = result.monthlyIncomeGoal;
      if (!response.ok || savedGoal === undefined) {
        throw new Error(result.error ?? "Could not save your monthly goal.");
      }
      setData((current) =>
        current ? { ...current, summary: { ...current.summary, monthlyIncomeGoal: savedGoal } } : current,
      );
      setNotice("Monthly income goal saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your monthly goal.");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["Date", "Amount (INR)", "Source", "Plan", "Note"],
      ...(data?.entries ?? []).map((entry) => [
        entry.date,
        entry.amount,
        entry.source,
        data?.plans.find((plan) => plan.id === entry.planId)?.name ?? "",
        entry.note,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "business-planner-income.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const summary = data?.summary;
  const goalProgress = summary?.monthlyIncomeGoal
    ? Math.min(100, Math.round((summary.thisMonth / summary.monthlyIncomeGoal) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {error ? <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
      {notice ? <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["This month", summary?.thisMonth ?? 0],
          ["Last month", summary?.lastMonth ?? 0],
          ["All time", summary?.allTime ?? 0],
          ["Best month", summary?.bestMonth ?? 0],
        ].map(([label, value]) => (
          <Card aria-busy={loading} key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{loading ? "—" : formatRupees(Number(value))}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly income goal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="monthly-goal">Goal (₹)</Label>
              <Input
                id="monthly-goal"
                max={100_000_000}
                min={0}
                onChange={(event) => setMonthlyGoal(event.target.value)}
                type="number"
                value={monthlyGoal}
              />
            </div>
            <Button disabled={saving || loading} onClick={() => void saveMonthlyGoal()} variant="outline">
              Save goal
            </Button>
          </div>
          {summary?.monthlyIncomeGoal ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatRupees(summary.thisMonth)} earned</span>
                <span>{goalProgress}%</span>
              </div>
              <Progress aria-label="Monthly income goal progress" value={goalProgress} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader><CardTitle>{editingId ? "Edit income entry" : "Add income"}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitEntry}>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input id="amount" min={0.01} onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="source">Source or client</Label>
                <Input id="source" maxLength={150} onChange={(event) => setSource(event.target.value)} required value={source} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="income-plan">Plan (optional)</Label>
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-background px-3 text-sm dark:border-slate-700"
                  id="income-plan"
                  onChange={(event) => setPlanId(event.target.value)}
                  value={planId}
                >
                  <option value="">No plan</option>
                  {data?.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="income-date">Date</Label>
                <Input id="income-date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="income-note">Note</Label>
                <Textarea id="income-note" maxLength={2000} onChange={(event) => setNote(event.target.value)} value={note} />
              </div>
              <div className="flex gap-2">
                <Button disabled={saving} type="submit">{saving ? "Saving..." : editingId ? "Update entry" : "Add entry"}</Button>
                {editingId ? <Button onClick={clearForm} type="button" variant="outline">Cancel</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Income entries</CardTitle>
            <Button onClick={exportCsv} size="sm" variant="outline">Export CSV</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="filter-plan">Plan</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" id="filter-plan" onChange={(event) => setPlanFilter(event.target.value)} value={planFilter}>
                  <option value="">All plans</option>
                  {data?.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-from">From</Label>
                <Input id="filter-from" onChange={(event) => setFromFilter(event.target.value)} type="date" value={fromFilter} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-to">To</Label>
                <Input id="filter-to" onChange={(event) => setToFilter(event.target.value)} type="date" value={toFilter} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500">
                  <tr><th className="p-2">Date</th><th className="p-2">Amount</th><th className="p-2">Source</th><th className="p-2">Plan</th><th className="p-2">Actions</th></tr>
                </thead>
                <tbody>
                  {data?.entries.map((entry) => (
                    <tr className="border-b last:border-b-0" key={entry.id}>
                      <td className="p-2">{entry.date}</td>
                      <td className="p-2 font-medium">{formatRupees(entry.amount)}</td>
                      <td className="p-2" title={entry.note}>{entry.source}</td>
                      <td className="p-2">{data.plans.find((plan) => plan.id === entry.planId)?.name ?? "—"}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button className="text-violet-700 hover:underline" onClick={() => editEntry(entry)} type="button">Edit</button>
                          <button className="text-red-600 hover:underline" onClick={() => void deleteEntry(entry.id)} type="button">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !data?.entries.length ? (
                    <tr><td className="p-5 text-center text-slate-500" colSpan={5}>No income entries match these filters.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {data?.daysToFirstIncome.length ? (
        <Card>
          <CardHeader><CardTitle>Days to first income</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.daysToFirstIncome.map((item) => (
              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900" key={item.planId}>
                <p className="font-medium">{item.businessName}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Actual: day {item.actualDays} · Expected: about day {item.expectedDays}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
