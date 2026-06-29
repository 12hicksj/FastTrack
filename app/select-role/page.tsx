"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BP } from "@/lib/api-path";

interface DemoUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ── Per-account descriptions tied to the seeded data ─────────────────────────

const ACCOUNT_META: Record<
  string,
  { description: string; detail: string }
> = {
  "customer@scale.insurance": {
    description: "Honda Civic · Toyota Camry",
    detail: "CLM-2024-001 · CLM-2024-002",
  },
  "customer2@scale.insurance": {
    description: "Ford F-150 · BMW 3 Series",
    detail: "CLM-2024-003 · CLM-2024-004",
  },
  "agent@scale.insurance": {
    description: "Reviews AI assessments and estimates",
    detail: "Approves, denies, or escalates claims",
  },
  "supervisor@scale.insurance": {
    description: "Final authority on escalated claims",
    detail: "High-value and fraud-flagged reviews",
  },
};

const ROLE_LABELS: Record<string, string> = {
  customer:   "Customer",
  agent:      "Claims Agent",
  supervisor: "Senior Adjuster",
};

const ROLE_COLORS: Record<string, { dot: string; badge: string }> = {
  customer:   { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200" },
  agent:      { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  supervisor: { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
};

const HOVER_COLORS: Record<string, string> = {
  customer:   "hover:border-blue-300 hover:bg-blue-50/30",
  agent:      "hover:border-violet-300 hover:bg-violet-50/30",
  supervisor: "hover:border-amber-300 hover:bg-amber-50/30",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SelectRolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<DemoUser[]>({
    queryKey: ["demo-users"],
    queryFn: () => fetch(`${BP}/api/users`).then((r) => r.json()),
    staleTime: Infinity,
  });

  async function selectUser(userId: number) {
    await fetch(`${BP}/api/auth/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    queryClient.clear();
    router.push("/claims");
  }

  const customers = users?.filter((u) => u.role === "customer") ?? [];
  const internal  = users?.filter((u) => u.role !== "customer") ?? [];

  function UserCard({ u }: { u: DemoUser }) {
    const colors = ROLE_COLORS[u.role] ?? { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600 border-gray-200" };
    const hover  = HOVER_COLORS[u.role] ?? "hover:border-border";
    const meta   = ACCOUNT_META[u.email];

    return (
      <button
        onClick={() => selectUser(u.userId)}
        className={`group w-full flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left transition-all duration-150 hover:shadow-sm ${hover}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{u.firstName} {u.lastName}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors.badge}`}>
              {ROLE_LABELS[u.role] ?? u.role}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{u.email}</p>
          {meta && (
            <p className="text-xs text-muted-foreground mt-1">
              {meta.description}
              <span className="text-border mx-1.5">·</span>
              {meta.detail}
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20">
      <div className="w-full max-w-lg">

        {/* Branding — matches the in-app header */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
              FT
            </span>
            <span className="text-2xl font-bold tracking-tight">FastTrack</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scale Car Insurance · AI-assisted damage assessment
          </p>
        </div>

        {/* User list */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">

            {/* Customers */}
            {customers.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                  Customers
                </p>
                <div className="space-y-2">
                  {customers.map((u) => <UserCard key={u.userId} u={u} />)}
                </div>
              </section>
            )}

            {/* Internal team */}
            {internal.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                  Internal team
                </p>
                <div className="space-y-2">
                  {internal.map((u) => <UserCard key={u.userId} u={u} />)}
                </div>
              </section>
            )}

          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Demo environment — no authentication required
        </p>
      </div>
    </div>
  );
}
