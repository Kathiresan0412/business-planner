"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  name: string;
  email: string;
  timezone: string;
  monthlyIncomeGoal: number;
  dailyReminderTime: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    name: "",
    email: "",
    timezone: "Asia/Colombo",
    monthlyIncomeGoal: 0,
    dailyReminderTime: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const result = await readJson<Settings>(await fetch("/api/settings"));
        if (active) setSettings(result);
      } catch (error) {
        if (active) setProfileError(error instanceof Error ? error.message : "Could not load settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile() {
    setSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const result = await readJson<Settings>(await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          monthlyIncomeGoal: Number(settings.monthlyIncomeGoal) || 0,
        }),
      }));
      setSettings(result);
      setProfileMessage("Settings saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    try {
      await readJson(await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      }));
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password changed.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change your password.");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      await readJson(await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      }));
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p aria-busy="true" className="text-sm text-slate-500">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile and preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                maxLength={100}
                onChange={(event) => setSettings({ ...settings, name: event.target.value })}
                value={settings.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" disabled value={settings.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-timezone">Timezone</Label>
              <Input
                id="settings-timezone"
                maxLength={100}
                onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
                placeholder="Asia/Colombo"
                value={settings.timezone}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-goal">Monthly income goal (LKR)</Label>
              <Input
                id="settings-goal"
                min={0}
                onChange={(event) => setSettings({ ...settings, monthlyIncomeGoal: Number(event.target.value) })}
                type="number"
                value={settings.monthlyIncomeGoal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-reminder">Daily reminder time</Label>
              <Input
                id="settings-reminder"
                onChange={(event) => setSettings({ ...settings, dailyReminderTime: event.target.value })}
                type="time"
                value={settings.dailyReminderTime}
              />
              <p className="text-xs text-slate-500">Preference only; reminders are not sent yet.</p>
            </div>
          </div>
          {profileError ? <p aria-live="polite" className="text-sm text-red-600">{profileError}</p> : null}
          {profileMessage ? <p aria-live="polite" className="text-sm text-emerald-700">{profileMessage}</p> : null}
          <div className="flex justify-end">
            <Button disabled={saving} onClick={() => void saveProfile()}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void changePassword(event)}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                autoComplete="current-password"
                id="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                autoComplete="new-password"
                id="new-password"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </div>
            {passwordError ? <p aria-live="polite" className="text-sm text-red-600 md:col-span-2">{passwordError}</p> : null}
            {passwordMessage ? <p aria-live="polite" className="text-sm text-emerald-700 md:col-span-2">{passwordMessage}</p> : null}
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Change password</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your data</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Download your plans, tasks, income, and leads as a JSON file.</p>
          <Button render={<a href="/api/settings/export" />} variant="outline">Export my data</Button>
        </CardContent>
      </Card>

      <Card className="border-red-300">
        <CardHeader><CardTitle className="text-red-700">Danger zone</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Permanently delete your account, plans, tasks, income, and leads. This cannot be undone.
          </p>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
            <Input
              autoComplete="off"
              id="delete-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              value={confirmation}
            />
          </div>
          {deleteError ? <p aria-live="polite" className="text-sm text-red-600">{deleteError}</p> : null}
          <Button
            disabled={confirmation !== "DELETE" || deleting}
            onClick={() => void deleteAccount()}
            variant="destructive"
          >
            {deleting ? "Deleting…" : "Delete account and data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
