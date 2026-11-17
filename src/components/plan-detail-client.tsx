"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, MessageSquare, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export type PlanDetailTask = {
  id: string;
  day: number;
  date: string;
  phase: string;
  title: string;
  originalTitle: string;
  isCustom: boolean;
  done: boolean;
  hoursSpent: number;
  notes: string;
};

type PlanDetailClientProps = {
  planId: string;
  businessName: string;
  emoji: string;
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate: string;
  today: string;
  totalIncome: number;
  tasks: PlanDetailTask[];
};

const PHASES = [
  "Research & Setup",
  "Build Presence",
  "First Samples/Launch",
  "Active Outreach",
  "First Customer",
  "Iterate & Improve",
  "Scale & Systems",
];

type TaskRowProps = {
  task: PlanDetailTask;
  isToday: boolean;
  isOverdue: boolean;
  onRefresh: () => void;
};

function TaskRow({ task, isToday, isOverdue, onRefresh }: TaskRowProps) {
  const [done, setDone] = useState(task.done);
  const [title, setTitle] = useState(task.title);
  const [hoursSpent, setHoursSpent] = useState(String(task.hoursSpent || ""));
  const [error, setError] = useState("");
  const savedTitle = useRef(task.title);
  const savedHours = useRef(task.hoursSpent);

  async function patch(changes: Record<string, unknown>, rollback: () => void) {
    setError("");
    try {
      const response = await fetch(`/api/plan-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update this task.");
      }
      onRefresh();
    } catch (updateError) {
      rollback();
      setError(updateError instanceof Error ? updateError.message : "Could not update this task.");
    }
  }

  function toggleDone(nextDone: boolean) {
    const previous = done;
    setDone(nextDone);
    void patch({ done: nextDone }, () => setDone(previous));
  }

  function saveTitle() {
    const nextTitle = title.trim();
    if (nextTitle === savedTitle.current) {
      return;
    }
    const previous = savedTitle.current;
    setTitle(nextTitle);
    void patch({ title: nextTitle }, () => {
      savedTitle.current = previous;
      setTitle(previous);
    });
    savedTitle.current = nextTitle;
  }

  function saveHours() {
    const nextHours = hoursSpent === "" ? 0 : Number(hoursSpent);
    if (!Number.isFinite(nextHours) || nextHours < 0 || nextHours > 24) {
      setError("Hours must be between 0 and 24.");
      setHoursSpent(savedHours.current ? String(savedHours.current) : "");
      return;
    }
    const previous = savedHours.current;
    if (nextHours === previous) {
      return;
    }
    savedHours.current = nextHours;
    void patch({ hoursSpent: nextHours }, () => {
      savedHours.current = previous;
      setHoursSpent(previous ? String(previous) : "");
    });
  }

  async function removeCustomTask() {
    if (!window.confirm("Remove this custom task and restore the original day?")) {
      return;
    }

    setError("");
    try {
      const response = await fetch(`/api/plan-tasks/${task.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not remove this custom task.");
      }
      onRefresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove this custom task.");
    }
  }

  const canReset = !task.isCustom && title !== task.originalTitle;

  return (
    <div
      className={`grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[40px_90px_minmax(180px,1fr)_110px_100px] md:items-center ${
        isToday ? "bg-violet-50 dark:bg-violet-950/30" : isOverdue ? "bg-amber-50/70 dark:bg-amber-950/20" : ""
      }`}
    >
      <label className="flex items-center gap-2 text-sm md:justify-center" aria-label={`Day ${task.day} completion`}>
        <input
          checked={done}
          className="h-4 w-4 accent-violet-600"
          onChange={(event) => toggleDone(event.target.checked)}
          type="checkbox"
        />
        <span className="md:sr-only">{done ? "Done" : "Pending"}</span>
      </label>
      <div className="text-sm">
        <p className="font-medium">Day {task.day}</p>
        <p className="text-xs text-slate-500">{task.date}</p>
      </div>
      <div className="min-w-0 space-y-1">
        <Input
          aria-label={`Task title for day ${task.day}`}
          maxLength={500}
          onBlur={saveTitle}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task for this day"
          value={title}
        />
        <div className="flex flex-wrap gap-2">
          {isToday ? <Badge>Today</Badge> : null}
          {isOverdue ? <Badge variant="outline">Overdue</Badge> : null}
          {task.isCustom ? <Badge variant="outline">Custom</Badge> : null}
          {task.notes ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500" title={task.notes}>
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
              Note
            </span>
          ) : null}
          {canReset ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
              onClick={() => {
                setTitle(task.originalTitle);
                        void patch({ resetToTemplate: true }, () => setTitle(task.title));
              }}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reset to original
            </button>
          ) : null}
          {task.isCustom ? (
            <button
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              onClick={() => void removeCustomTask()}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Delete custom
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Hours spent on day ${task.day}`}
          max={24}
          min={0}
          onBlur={saveHours}
          onChange={(event) => setHoursSpent(event.target.value)}
          placeholder="0"
          step="0.25"
          type="number"
          value={hoursSpent}
        />
        <span className="text-xs text-slate-500">hrs</span>
      </div>
      <span className="text-xs text-slate-500">{task.phase}</span>
      {error ? <p aria-live="polite" className="text-xs text-red-600 md:col-start-3">{error}</p> : null}
    </div>
  );
}

export function PlanDetailClient({
  planId,
  businessName,
  emoji,
  status: initialStatus,
  startDate: initialStartDate,
  endDate,
  today,
  totalIncome,
  tasks: initialTasks,
}: PlanDetailClientProps) {
  const router = useRouter();
  const tasks = initialTasks;
  const [status, setStatus] = useState(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [filter, setFilter] = useState<"all" | "done" | "pending" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  const completedTasks = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalHours = tasks.reduce((sum, task) => sum + task.hoursSpent, 0);

  async function updatePlan(changes: { status?: typeof status; startDate?: string }) {
    setError("");
    setSavingPlan(true);
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update this plan.");
      }
      if (changes.status) setStatus(changes.status);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update this plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function deletePlan() {
    setError("");
    setSavingPlan(true);
    try {
      const response = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete this plan.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this plan.");
    } finally {
      setSavingPlan(false);
      setDeleteOpen(false);
    }
  }

  function exportCsv() {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ["Day", "Date", "Phase", "Task", "Done", "Hours", "Notes"],
      ...tasks.map((task) => [
        task.day,
        task.date,
        task.phase,
        task.title,
        task.done ? "Yes" : "No",
        task.hoursSpent,
        task.notes,
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-90-day-plan.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Plan detail</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <span aria-hidden="true">{emoji || "💼"}</span>
            {businessName}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {startDate} – {endDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "active" ? "default" : "outline"}>{status}</Badge>
          <Button onClick={exportCsv} variant="outline">
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span>{completedTasks} of {tasks.length} tasks complete</span>
            <span>{progress}%</span>
          </div>
          <Progress aria-label="Plan completion" value={progress} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Total hours</p>
              <p className="mt-1 text-2xl font-bold">{totalHours.toLocaleString("en-IN")}h</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Income logged</p>
              <p className="mt-1 text-2xl font-bold">
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
              <p className="text-sm text-slate-500">Days left</p>
              <p className="mt-1 text-2xl font-bold">
                {Math.min(90, Math.max(0, 90 - Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000)))}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="plan-start-date">Shift start date</label>
              <Input id="plan-start-date" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </div>
            <Button
              disabled={savingPlan || startDate === initialStartDate}
              onClick={() => void updatePlan({ startDate })}
              variant="outline"
            >
              Save date
            </Button>
            {status !== "completed" ? (
              <>
                <Button
                  disabled={savingPlan}
                  onClick={() => void updatePlan({ status: status === "active" ? "paused" : "active" })}
                  variant="outline"
                >
                  {status === "active" ? "Pause plan" : "Resume plan"}
                </Button>
                <Button disabled={savingPlan} onClick={() => void updatePlan({ status: "completed" })} variant="outline">
                  Complete plan
                </Button>
              </>
            ) : null}
            <Button disabled={savingPlan} onClick={() => setDeleteOpen(true)} variant="destructive">
              Delete plan
            </Button>
          </div>
          {error ? <p aria-live="polite" className="text-sm text-red-600">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "done", "pending", "overdue"] as const).map((value) => (
            <Button
              key={value}
              onClick={() => setFilter(value)}
              size="sm"
              variant={filter === value ? "default" : "outline"}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
        <Input
          aria-label="Search tasks"
          className="sm:max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks"
          value={search}
        />
      </div>

      <div className="space-y-4">
        {PHASES.map((phase) => {
          const phaseTasks = tasks.filter((task) => task.phase === phase);
          const filteredTasks = phaseTasks.filter((task) => {
            const isOverdue = task.date < today && !task.done;
            const matchesFilter =
              filter === "all" ||
              (filter === "done" && task.done) ||
              (filter === "pending" && !task.done) ||
              (filter === "overdue" && isOverdue);
            return matchesFilter && task.title.toLowerCase().includes(search.toLowerCase());
          });
          const phaseDone = phaseTasks.filter((task) => task.done).length;
          if (!filteredTasks.length) return null;

          return (
            <details className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800" key={phase} open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
                <span>{phase}</span>
                <span className="text-sm font-normal text-slate-500">
                  {phaseDone}/{phaseTasks.length} done
                </span>
              </summary>
              <div className="px-4 pb-4">
                <Progress aria-label={`${phase} completion`} value={phaseTasks.length ? (phaseDone / phaseTasks.length) * 100 : 0} />
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  {filteredTasks.map((task) => (
                    <TaskRow
                      isOverdue={task.date < today && !task.done}
                      isToday={task.date === today}
                      key={`${task.id}-${task.done}-${task.title}-${task.hoursSpent}`}
                      onRefresh={refresh}
                      task={task}
                    />
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this plan?</DialogTitle>
            <DialogDescription>
              This permanently removes the plan and all of its tasks. Income and lead records are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteOpen(false)} variant="outline">Cancel</Button>
            <Button disabled={savingPlan} onClick={() => void deletePlan()} variant="destructive">
              Delete plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
