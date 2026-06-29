"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { SessionUser } from "@/auth";
import { BP } from "@/lib/api-path";

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

const ROLE_COLORS: Record<string, string> = {
  customer: "bg-blue-500",
  agent: "bg-violet-500",
  supervisor: "bg-amber-500",
};

export function RoleSwitcher({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users } = useQuery<DemoUser[]>({
    queryKey: ["demo-users"],
    queryFn: () => fetch(`${BP}/api/users`).then((r) => r.json()),
    staleTime: Infinity,
  });

  async function switchTo(userId: number) {
    await fetch(`${BP}/api/auth/switch`, {
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
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1.5"}
      >
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${ROLE_COLORS[currentUser.role] ?? "bg-gray-400"}`}
        />
        {currentUser.firstName} {currentUser.lastName}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">Switch demo role</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {users?.map((u) => (
            <DropdownMenuItem
              key={u.userId}
              disabled={u.userId === currentUser.userId}
              onClick={() => switchTo(u.userId)}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${ROLE_COLORS[u.role] ?? "bg-gray-400"}`}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {u.firstName} {u.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
