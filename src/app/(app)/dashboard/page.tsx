import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Active plans", value: "3" },
  { label: "Tasks done this week", value: "18" },
  { label: "Current streak", value: "7 days" },
  { label: "Income total", value: "₹24,500" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress by plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: "Content Writing", percent: 72 },
              { name: "Social Media Management", percent: 48 },
              { name: "Video Editing", percent: 31 },
            ].map((plan) => (
              <div key={plan.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{plan.name}</span>
                  <span>{plan.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-violet-600" style={{ width: `${plan.percent}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Week summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This is where charts and weekly performance will appear once the data layer is connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
