"use client";

import { useEffect, useState } from "react";

export function FollowUpCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCount() {
      try {
        const response = await fetch("/api/leads?countOnly=true");
        if (!response.ok) throw new Error("Could not load follow-up count.");
        const result = (await response.json()) as { followUpsDueToday: number };
        if (active) setCount(result.followUpsDueToday);
      } catch (error) {
        console.error("Follow-up count query failed:", error);
        if (active) setCount(-1);
      }
    }

    void loadCount();
    return () => {
      active = false;
    };
  }, []);

  if (count === null || count === 0) return null;

  return (
    <span
      aria-label={count < 0 ? "Follow-up count unavailable" : `${count} follow-ups due today`}
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
    >
      {count < 0 ? "!" : count > 9 ? "9+" : count}
    </span>
  );
}
