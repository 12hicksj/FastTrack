"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClaimSummary } from "@/shared/schemas";

export function useClaims() {
  return useQuery<ClaimSummary[]>({
    queryKey: ["claims"],
    queryFn: () => fetch("/api/claims").then((r) => r.json()),
  });
}
