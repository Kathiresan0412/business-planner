import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlanPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Plan detail</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Content Writing</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge>Active</Badge>
          <Button variant="outline">Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>90-day summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 rounded-full bg-slate-200">
            <div className="h-3 rounded-full bg-violet-600" style={{ width: "58%" }} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Total hours</p>
              <p className="mt-2 text-2xl font-bold">42h</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Income</p>
              <p className="mt-2 text-2xl font-bold">₹18,500</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">Days left</p>
              <p className="mt-2 text-2xl font-bold">62</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
