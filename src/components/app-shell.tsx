import Link from "next/link";
import { BriefcaseBusiness, CalendarRange, DollarSign, LayoutDashboard, Settings, Target } from "lucide-react";

import { UserMenu } from "@/components/user-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Target },
  { href: "/income", label: "Income", icon: DollarSign },
  { href: "/leads", label: "Leads", icon: BriefcaseBusiness },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">Planner</p>
              <p className="truncate text-sm font-semibold sm:text-lg">90-Day Business Planner</p>
            </div>
          </div>

          <nav aria-label="Primary navigation" className="hidden items-center gap-2 lg:flex">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <UserMenu userName={userName} />
        </div>
        <nav
          aria-label="Mobile primary navigation"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 lg:hidden sm:px-6"
        >
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
