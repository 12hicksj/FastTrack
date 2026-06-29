"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ClipboardList, ShieldCheck } from "lucide-react";

interface DemoUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const ROLE_META: Record<string, { label: string; description: string; Icon: typeof User }> = {
  customer: {
    label: "Customer",
    description: "Submit a new claim and upload photos",
    Icon: User,
  },
  agent: {
    label: "Claims Agent",
    description: "Review damage assessments, run AI analysis, and submit decisions",
    Icon: ClipboardList,
  },
  supervisor: {
    label: "Senior Adjuster",
    description: "Approve escalated and high-value claims",
    Icon: ShieldCheck,
  },
};

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">FastTrack</h1>
        <p className="text-muted-foreground mt-1">AI-Assisted Damage Assessment · Scale Car Insurance</p>
      </div>

      <p className="text-sm text-muted-foreground mb-6">Select a demo role to continue</p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {users?.map((u) => {
            const meta = ROLE_META[u.role];
            if (!meta) return null;
            const Icon = meta.Icon;
            return (
              <Card
                key={u.userId}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => selectUser(u.userId)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{meta.label}</span>
                  </div>
                  <CardTitle className="text-base">
                    {u.firstName} {u.lastName}
                  </CardTitle>
                  <CardDescription className="text-xs">{u.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
