import { SettingsForm } from "@/components/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      <SettingsForm />
    </div>
  );
}
