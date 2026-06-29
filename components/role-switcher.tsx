"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { SessionUser } from "@/auth";

interface DemoUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  agent: "Claims Agent",
  supervisor: "Senior Adjuster",
};

export function RoleSwitcher({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users } = useQuery<DemoUser[]>({
    queryKey: ["demo-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    staleTime: Infinity,
  });

  async function switchTo(userId: number) {
    await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    queryClient.clear();
    router.push("/claims");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1"}>
        {currentUser.firstName} {currentUser.lastName}
        <span className="text-muted-foreground">· {ROLE_LABELS[currentUser.role] ?? currentUser.role}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch demo role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users?.map((u) => (
          <DropdownMenuItem
            key={u.userId}
            disabled={u.userId === currentUser.userId}
            onSelect={() => switchTo(u.userId)}
          >
            <div className="flex flex-col">
              <span className="font-medium">{u.firstName} {u.lastName}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
