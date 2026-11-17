"use client";

import { BarChart3, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ userName }: { userName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className={buttonVariants({ variant: "outline", className: "gap-2" })}
      >
        <BarChart3 className="h-4 w-4" />
        <span className="hidden max-w-32 truncate sm:inline">{userName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
