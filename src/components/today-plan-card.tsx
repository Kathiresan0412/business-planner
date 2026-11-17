"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { dateKeyDifferenceInDays } from "@/lib/plan-dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type TodayTask = {
  id: string;
  day: number;
  date: string;
  phase: string;
  title: string;
  done: boolean;
  hoursSpent: number;
  notes: string;
  isCustom: boolean;
};

type TodayPlanCardProps = {
  planId: string;
  businessName: string;
  emoji: string;
  today: string;
  startDate: string;
  endDate: string;
  currentDay: number;
  currentPhase: string;
  streak: number;
  todayTasks: TodayTask[];
  missedTasks: TodayTask[];
  upcomingTasks: TodayTask[];
};

function TaskEditor({
  task,
  today,
  moveToToday = false,
}: {
  task: TodayTask;
  today: string;
  moveToToday?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(task.done);
  const [title, setTitle] = useState(task.title);
  const [hoursSpent, setHoursSpent] = useState(String(task.hoursSpent || ""));
  const [notes, setNotes] = useState(task.notes);
  const [error, setError] = useState("");
  const savedFields = useRef({ hoursSpent: task.hoursSpent, notes: task.notes });

  useEffect(() => {
    const numericHours = hoursSpent === "" ? 0 : Number(hoursSpent);
    if (
      !Number.isFinite(numericHours) ||
      numericHours < 0 ||
      numericHours > 24 ||
      (numericHours === savedFields.current.hoursSpent && notes === savedFields.current.notes)
    ) {
      return;
    }

    const previous = savedFields.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/plan-tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hoursSpent: numericHours, notes }),
          signal: controller.signal,
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Could not save your task details.");
        }

        savedFields.current = { hoursSpent: numericHours, notes };
        setError("");
      } catch (saveError) {
        if (controller.signal.aborted) {
          return;
        }
        setHoursSpent(previous.hoursSpent ? String(previous.hoursSpent) : "");
        setNotes(previous.notes);
        setError(saveError instanceof Error ? saveError.message : "Could not save your task details.");
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [hoursSpent, notes, task.id]);

  async function updateTask(changes: { done?: boolean; title?: string; date?: string }) {
    const previous = { done, title };
    if (changes.done !== undefined) setDone(changes.done);
    if (changes.title !== undefined) setTitle(changes.title);
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

      router.refresh();
    } catch (updateError) {
      setDone(previous.done);
      setTitle(previous.title);
      setError(updateError instanceof Error ? updateError.message : "Could not update this task.");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            aria-label={`Mark day ${task.day} task ${done ? "not done" : "done"}`}
            checked={done}
            className="mt-1 h-5 w-5 accent-violet-600"
            onChange={(event) => void updateTask({ done: event.target.checked })}
            type="checkbox"
          />
          <div className="min-w-0">
            {title ? (
              <p className={`font-medium ${done ? "text-slate-500 line-through" : ""}`}>{title}</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="Add a task for this day"
                  className="sm:max-w-md"
                  maxLength={500}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Add your own task for today"
                  value={title}
                />
                <Button
                  disabled={!title.trim()}
                  onClick={() => void updateTask({ title: title.trim() })}
                  size="sm"
                  type="button"
                >
                  Save task
                </Button>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Day {task.day} · {task.phase}</p>
          </div>
        </div>
        {moveToToday ? (
          <Button onClick={() => void updateTask({ date: today })} size="sm" variant="outline">
            Move to today
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`hours-${task.id}`}>Hours spent</Label>
          <Input
            id={`hours-${task.id}`}
            max={24}
            min={0}
            onChange={(event) => setHoursSpent(event.target.value)}
            placeholder="0"
            step="0.25"
            type="number"
            value={hoursSpent}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`notes-${task.id}`}>Notes</Label>
          <Textarea
            id={`notes-${task.id}`}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a quick note; it saves automatically."
            value={notes}
          />
        </div>
      </div>
      {error ? <p aria-live="polite" className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function TodayPlanCard({
  planId,
  businessName,
  emoji,
  today,
  startDate,
  endDate,
  currentDay,
  currentPhase,
  streak,
  todayTasks,
  missedTasks,
  upcomingTasks,
}: TodayPlanCardProps) {
  const startsInDays = Math.max(0, dateKeyDifferenceInDays(today, startDate));
  const hasStarted = today >= startDate;
  const hasFinished = today > endDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-3xl">{emoji || "💼"}</span>
            <div>
              <CardTitle>{businessName}</CardTitle>
              <Link className="mt-1 inline-block text-sm text-violet-600 hover:underline" href={`/plan/${planId}`}>
                View 90-day plan
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasStarted && !hasFinished ? <Badge>Day {currentDay} of 90</Badge> : null}
            {currentPhase ? <Badge variant="outline">{currentPhase}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasStarted ? (
          <div className="rounded-lg bg-violet-50 p-4 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
            Starts in {startsInDays} {startsInDays === 1 ? "day" : "days"}.
          </div>
        ) : hasFinished ? (
          <div className="rounded-lg bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <p className="font-semibold">Plan finished 🎉</p>
            <Link className="mt-1 inline-block underline" href={`/plan/${planId}`}>
              Review your results
            </Link>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Today&apos;s tasks</h2>
                <p className="text-sm text-slate-500">Current streak: {streak} {streak === 1 ? "day" : "days"}</p>
              </div>
              {todayTasks.length ? (
                <div className="space-y-3">
                  {todayTasks.map((task) => <TaskEditor key={task.id} task={task} today={today} />)}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-slate-600 dark:text-slate-300">
                  No task is scheduled for today.
                </p>
              )}
            </section>

            {missedTasks.length ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Missed tasks</h2>
                {missedTasks.map((task) => (
                  <TaskEditor key={task.id} moveToToday task={task} today={today} />
                ))}
              </section>
            ) : null}

            {upcomingTasks.length ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Coming up</h2>
                <ul className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <li className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900" key={task.id}>
                      <span className="font-medium">Day {task.day} · {task.date}</span>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{task.title || "No task added yet."}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
