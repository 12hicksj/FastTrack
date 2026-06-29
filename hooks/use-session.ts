"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/auth";

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: () => fetch("/api/auth/session").then((r) => r.json()),
    staleTime: 60_000,
  });
}
