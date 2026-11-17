import { Suspense } from "react";

import { IncomeTracker } from "@/components/income-tracker";

export default function IncomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Finance</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Income tracker</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Record payments and compare progress with your goals.</p>
      </div>
      <Suspense fallback={<div aria-busy="true" className="h-[700px] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />}>
        <IncomeTracker />
      </Suspense>
    </div>
  );
}
