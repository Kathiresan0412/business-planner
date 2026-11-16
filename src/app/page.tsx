import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-slate-50 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-4xl border-slate-200 shadow-lg">
        <CardContent className="grid gap-8 p-8 md:grid-cols-2 md:p-10">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-600">Product launch</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              90-Day Business Planner
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Turn your business playbook into a daily execution system with plans, tasks, income tracking, and momentum dashboards.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button className="w-full sm:w-auto">Log in</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full sm:w-auto">
                  Create account
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-800 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Today</p>
                <p className="mt-3 text-xl font-semibold">Publish one sample article and pitch 5 prospects.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Progress</p>
                  <p className="mt-2 text-2xl font-bold">72%</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Income</p>
                  <p className="mt-2 text-2xl font-bold">₹24k</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
