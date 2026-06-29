"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface DemoUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ROLE_META: Record<
  string,
  { label: string; description: string; accent: string }
> = {
  customer: {
    label: "Customer",
    description: "Submit a new claim and upload damage photos",
    accent: "group-hover:border-blue-500",
  },
  agent: {
    label: "Claims Agent",
    description: "Review damage assessments, run AI analysis, approve or deny",
    accent: "group-hover:border-violet-500",
  },
  supervisor: {
    label: "Senior Adjuster",
    description: "Approve escalated and high-value claims",
    accent: "group-hover:border-amber-500",
  },
};

const ROLE_ORDER = ["customer", "agent", "supervisor"];

export default function SelectRolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<DemoUser[]>({
    queryKey: ["demo-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    staleTime: Infinity,
  });

  async function selectUser(userId: number) {
    await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    queryClient.clear();
    router.push("/claims");
  }

  const sorted = users
    ? ROLE_ORDER.map((r) => users.find((u) => u.role === r)).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
            Scale Car Insurance
          </p>
          <h1 className="text-3xl font-bold tracking-tight">FastTrack</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            AI-assisted damage assessment · Demo
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wide font-medium">
          Select a role to continue
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((u) => {
              if (!u) return null;
              const meta = ROLE_META[u.role];
              if (!meta) return null;
              return (
                <button
                  key={u.userId}
                  onClick={() => selectUser(u.userId)}
                  className={`group w-full flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left transition-all hover:shadow-sm ${meta.accent}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {meta.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
