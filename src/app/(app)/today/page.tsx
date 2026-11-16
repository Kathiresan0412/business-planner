import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TodayPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Today</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Plan overview</h1>
        </div>
        <Badge className="text-sm">Day 12 of 90</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Writing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-violet-700">Today&apos;s task</p>
            <p className="text-xl font-semibold">Publish one sample article on a niche topic and pitch it to 5 prospects.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button>Mark as done</Button>
            <Button variant="outline">Add custom task</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
