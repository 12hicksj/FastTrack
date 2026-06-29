"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClaimSummary } from "@/shared/schemas";
import { BP } from "@/lib/api-path";

export function useClaims() {
  return useQuery<ClaimSummary[]>({
    queryKey: ["claims"],
    queryFn: () => fetch(`${BP}/api/claims`).then((r) => r.json()),
  });
}
