"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StartPlanDialogProps = {
  templateSlug: string;
  businessName: string;
};

function todayInPlannerTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function StartPlanDialog({ templateSlug, businessName }: StartPlanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayInPlannerTimezone);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug, startDate }),
      });
      const result = (await response.json()) as {
        error?: string;
        plan?: { id: string };
        showFocusWarning?: boolean;
      };

      if (!response.ok || !result.plan) {
        setError(result.error ?? "Could not start this plan.");
        return;
      }

      setOpen(false);
      router.refresh();
      if (result.showFocusWarning) {
        setNotice("Focus beats spreading thin. You now have four or more active plans.");
      }
    } catch {
      setError("Could not start this plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        Start plan
      </Button>
      {notice ? <p aria-live="polite" className="mt-2 text-xs text-amber-700">{notice}</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start {businessName}</DialogTitle>
            <DialogDescription>Choose when your 90-day plan should begin.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor={`start-date-${templateSlug}`}>Start date</Label>
              <Input
                id={`start-date-${templateSlug}`}
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
            </div>
            {error ? <p aria-live="polite" className="text-sm text-red-600">{error}</p> : null}
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Starting plan..." : "Confirm start date"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
