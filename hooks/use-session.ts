"use client";

import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/auth";
import { BP } from "@/lib/api-path";

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: () => fetch(`${BP}/api/auth/session`).then((r) => r.json()),
    staleTime: 60_000,
  });
}
