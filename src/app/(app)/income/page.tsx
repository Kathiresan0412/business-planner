import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function IncomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Finance</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Income tracker</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add income</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" type="number" placeholder="2500" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input id="source" placeholder="Client / project / product" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Input id="plan" placeholder="Select a plan" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button>Save income</Button>
      </div>
    </div>
  );
}
