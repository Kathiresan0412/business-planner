import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return <AppShell userName={user?.name ?? "Account"}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShell userName="Account">{children}</AppShell>}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
