"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClaimDetail } from "@/shared/schemas";
import { BP } from "@/lib/api-path";

export function useClaim(claimId: string) {
  return useQuery<ClaimDetail>({
    queryKey: ["claims", claimId],
    queryFn: () => fetch(`${BP}/api/claims/${claimId}`).then((r) => r.json()),
    enabled: !!claimId,
  });
}
