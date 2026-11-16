import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const columns = ["New", "Contacted", "Replied", "Proposal", "Won", "Lost"];

export default function LeadsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">CRM</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Leads pipeline</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {columns.map((column) => (
          <Card key={column}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                {column}
                <Badge variant="secondary">{column === "New" ? 4 : 2}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Example lead
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Example lead
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
