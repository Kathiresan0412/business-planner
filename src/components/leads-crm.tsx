"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { BriefcaseBusiness, CalendarClock, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { leadPlatforms, leadStatuses } from "@/lib/lead-options";

type LeadStatus = (typeof leadStatuses)[number];
type LeadPlatform = (typeof leadPlatforms)[number];

type Lead = {
  id: string;
  planId: string;
  name: string;
  platform: LeadPlatform;
  contact: string;
  status: LeadStatus;
  nextFollowUpDate: string;
  notes: string;
  valueExpected: number;
};

type PlanOption = { id: string; name: string };
type FollowUp = { id: string; name: string; nextFollowUpDate: string };
type Summary = { total: number; contacted: number; replyRate: number; winRate: number; pipelineValue: number };
type LeadForm = Omit<Lead, "id">;

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const PLATFORM_LABELS: Record<LeadPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  email: "Email",
  whatsapp: "WhatsApp",
  upwork: "Upwork",
  fiverr: "Fiverr",
  other: "Other",
};

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const EMPTY_FORM: LeadForm = {
  planId: "",
  name: "",
  platform: "email",
  contact: "",
  status: "new",
  nextFollowUpDate: "",
  notes: "",
  valueExpected: 0,
};

async function responseJson<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The request could not be completed.");
  }
  return result;
}

function LeadCard({
  lead,
  onEdit,
}: {
  lead: Lead;
  onEdit: (lead: Lead) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.45 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Edit ${lead.name}`}
      className="cursor-grab rounded-xl border bg-white p-3 shadow-sm transition hover:border-violet-300 active:cursor-grabbing dark:bg-slate-950"
      onClick={() => onEdit(lead)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(lead);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{lead.name}</p>
        <Badge variant="outline">{PLATFORM_LABELS[lead.platform]}</Badge>
      </div>
      {lead.contact ? <p className="mt-1 truncate text-xs text-slate-500">{lead.contact}</p> : null}
      {lead.valueExpected > 0 ? (
        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {CURRENCY.format(lead.valueExpected)}
        </p>
      ) : null}
      {lead.nextFollowUpDate ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
          Follow up {lead.nextFollowUpDate}
        </p>
      ) : null}
    </div>
  );
}

function PipelineColumn({
  status,
  leads,
  onEdit,
}: {
  status: LeadStatus;
  leads: Lead[];
  onEdit: (lead: Lead) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]} leads`}
      className={`min-h-64 rounded-xl border p-3 transition ${
        isOver ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30" : "bg-slate-50/70 dark:bg-slate-900/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{STATUS_LABELS[status]}</h2>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} onEdit={onEdit} />)}
        {leads.length === 0 ? <p className="py-5 text-center text-xs text-slate-400">Drop leads here</p> : null}
      </div>
    </section>
  );
}

export function LeadsCrm() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [today, setToday] = useState("");
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    contacted: 0,
    replyRate: 0,
    winRate: 0,
    pipelineValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [incomePrompt, setIncomePrompt] = useState<Lead | null>(null);
  const [incomeError, setIncomeError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (planFilter) params.set("planId", planFilter);
      if (platformFilter) params.set("platform", platformFilter);
      const result = await responseJson<{
        leads: Lead[];
        plans: PlanOption[];
        followUps: FollowUp[];
        today: string;
        summary: Summary;
      }>(await fetch(`/api/leads?${params.toString()}`));
      setLeads(result.leads);
      setPlans(result.plans);
      setFollowUps(result.followUps);
      setToday(result.today);
      setSummary(result.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [planFilter, platformFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const visibleLeads = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads.filter((lead) =>
      !needle ||
      lead.name.toLowerCase().includes(needle) ||
      lead.contact.toLowerCase().includes(needle) ||
      lead.notes.toLowerCase().includes(needle)
    );
  }, [leads, search]);

  function openForm(lead?: Lead) {
    setError("");
    setEditingLead(lead ?? null);
    setForm(lead ? {
      planId: lead.planId,
      name: lead.name,
      platform: lead.platform,
      contact: lead.contact,
      status: lead.status,
      nextFollowUpDate: lead.nextFollowUpDate,
      notes: lead.notes,
      valueExpected: lead.valueExpected,
    } : { ...EMPTY_FORM, planId: plans[0]?.id ?? "" });
    setFormOpen(true);
  }

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editingLead ? `/api/leads/${editingLead.id}` : "/api/leads", {
        method: editingLead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nextFollowUpDate: form.nextFollowUpDate || null,
          valueExpected: Number(form.valueExpected) || 0,
        }),
      });
      await responseJson(response);
      setFormOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this lead.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    if (lead.status === status) return;
    setError("");
    try {
      const result = await responseJson<{ lead: Lead }>(await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
      setLeads((current) => current.map((item) => item.id === lead.id ? result.lead : item));
      await load();
      if (status === "won") setIncomePrompt(result.lead);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update this lead.");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!event.over || typeof event.active.id !== "string" || typeof event.over.id !== "string") return;
    if (!(leadStatuses as readonly string[]).includes(event.over.id)) return;
    const lead = leads.find((item) => item.id === event.active.id);
    if (lead) await changeStatus(lead, event.over.id as LeadStatus);
  }

  async function deleteLead() {
    if (!editingLead || !window.confirm(`Delete ${editingLead.name}?`)) return;
    setSaving(true);
    setError("");
    try {
      await responseJson(await fetch(`/api/leads/${editingLead.id}`, { method: "DELETE" }));
      setFormOpen(false);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this lead.");
    } finally {
      setSaving(false);
    }
  }

  async function recordLeadIncome() {
    if (!incomePrompt) return;
    setIncomeError("");
    try {
      await responseJson(await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: incomePrompt.valueExpected,
          source: incomePrompt.name,
          planId: incomePrompt.planId,
          date: today,
          note: "Recorded from a won lead.",
        }),
      }));
      setIncomePrompt(null);
    } catch (recordError) {
      setIncomeError(recordError instanceof Error ? recordError.message : "Could not record this income.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">CRM</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Leads pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">Track outreach from first contact through close.</p>
        </div>
        <Button onClick={() => openForm()} disabled={!plans.length}>
          <Plus aria-hidden="true" />
          Add lead
        </Button>
      </div>

      {followUps.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50/70 dark:bg-amber-950/20">
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
            <CalendarClock aria-hidden="true" className="h-4 w-4 text-amber-700" />
            <strong>{followUps.length} follow-up{followUps.length === 1 ? "" : "s"} due today</strong>
            <span className="text-slate-600 dark:text-slate-300">
              {followUps.slice(0, 3).map((lead) => lead.name).join(", ")}
              {followUps.length > 3 ? ` and ${followUps.length - 3} more` : ""}
            </span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total leads", String(summary.total)],
          ["Contacted", String(summary.contacted)],
          ["Reply rate", `${summary.replyRate}%`],
          ["Win rate", `${summary.winRate}%`],
          ["Pipeline value", CURRENCY.format(summary.pipelineValue)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search leads"
          className="w-full sm:max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search leads"
          value={search}
        />
        <select
          aria-label="Filter by plan"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          onChange={(event) => setPlanFilter(event.target.value)}
          value={planFilter}
        >
          <option value="">All plans</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
        </select>
        <select
          aria-label="Filter by platform"
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          onChange={(event) => setPlatformFilter(event.target.value)}
          value={platformFilter}
        >
          <option value="">All platforms</option>
          {leadPlatforms.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
        </select>
        <div className="ml-auto flex gap-1">
          <Button aria-label="Board view" onClick={() => setView("board")} size="icon" variant={view === "board" ? "secondary" : "ghost"}>
            <LayoutGrid aria-hidden="true" />
          </Button>
          <Button aria-label="List view" onClick={() => setView("list")} size="icon" variant={view === "list" ? "secondary" : "ghost"}>
            <List aria-hidden="true" />
          </Button>
        </div>
      </div>

      {error ? <p aria-live="polite" className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading leads…</p> : null}
      {!loading && leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BriefcaseBusiness aria-hidden="true" className="h-8 w-8 text-slate-400" />
            <p className="font-medium">No leads yet</p>
            <p className="text-sm text-slate-500">
              {plans.length ? "Add your first lead to start building your pipeline." : "Start a business plan before adding leads."}
            </p>
          </CardContent>
        </Card>
      ) : null}
      {!loading && leads.length > 0 && visibleLeads.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No leads match these filters.</p>
      ) : null}

      {!loading && view === "board" && visibleLeads.length > 0 ? (
        <DndContext onDragEnd={(event) => void onDragEnd(event)}>
          <div className="grid gap-3 overflow-x-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {leadStatuses.map((status) => (
              <PipelineColumn
                key={status}
                status={status}
                leads={visibleLeads.filter((lead) => lead.status === status)}
                onEdit={openForm}
              />
            ))}
          </div>
        </DndContext>
      ) : null}

      {!loading && view === "list" && visibleLeads.length > 0 ? (
        <Card>
          <div className="divide-y">
            {visibleLeads.map((lead) => (
              <button
                key={lead.id}
                className="grid w-full gap-2 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900 sm:grid-cols-[1fr_130px_120px_140px] sm:items-center"
                onClick={() => openForm(lead)}
                type="button"
              >
                <span className="font-medium">{lead.name}<span className="ml-2 text-xs font-normal text-slate-500">{lead.contact}</span></span>
                <span className="text-sm text-slate-600">{PLATFORM_LABELS[lead.platform]}</span>
                <span className="text-sm text-slate-600">{STATUS_LABELS[lead.status]}</span>
                <span className="text-sm font-medium">{lead.valueExpected ? CURRENCY.format(lead.valueExpected) : "—"}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog onOpenChange={setFormOpen} open={formOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit lead" : "Add a lead"}</DialogTitle>
            <DialogDescription>Keep contact details and next steps with the business plan.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(event) => void saveLead(event)}>
            <label className="block space-y-1 text-sm">
              <span>Name</span>
              <Input maxLength={150} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Plan</span>
              <select
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                onChange={(event) => setForm({ ...form, planId: event.target.value })}
                required
                value={form.planId}
              >
                <option value="" disabled>Select a plan</option>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Platform</span>
                <select
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  onChange={(event) => setForm({ ...form, platform: event.target.value as LeadPlatform })}
                  value={form.platform}
                >
                  {leadPlatforms.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Status</span>
                <select
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatus })}
                  value={form.status}
                >
                  {leadStatuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span>Contact</span>
              <Input maxLength={250} onChange={(event) => setForm({ ...form, contact: event.target.value })} value={form.contact} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Next follow-up</span>
                <Input onChange={(event) => setForm({ ...form, nextFollowUpDate: event.target.value })} type="date" value={form.nextFollowUpDate} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Expected value (INR)</span>
                <Input min={0} onChange={(event) => setForm({ ...form, valueExpected: Number(event.target.value) })} type="number" value={form.valueExpected} />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span>Notes</span>
              <textarea
                className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                maxLength={2000}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                value={form.notes}
              />
            </label>
            {error ? <p aria-live="polite" className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              {editingLead ? (
                <Button disabled={saving} onClick={() => void deleteLead()} type="button" variant="destructive">
                  <Trash2 aria-hidden="true" /> Delete
                </Button>
              ) : null}
              <Button disabled={saving} type="submit">{saving ? "Saving…" : "Save lead"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => { if (!open) { setIncomePrompt(null); setIncomeError(""); } }} open={incomePrompt !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead won!</DialogTitle>
            <DialogDescription>
              {incomePrompt?.valueExpected
                ? `Record ${CURRENCY.format(incomePrompt.valueExpected)} from ${incomePrompt.name} as income?`
                : `Would you like to add income from ${incomePrompt?.name} now?`}
            </DialogDescription>
          </DialogHeader>
          {incomeError ? <p aria-live="polite" className="text-sm text-red-600">{incomeError}</p> : null}
          <DialogFooter>
            <Button onClick={() => setIncomePrompt(null)} variant="outline">Not now</Button>
            <Button disabled={!incomePrompt?.valueExpected} onClick={() => void recordLeadIncome()}>
              Record income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
