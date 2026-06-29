"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClaimDetail } from "@/shared/schemas";

export function useClaim(claimId: string) {
  return useQuery<ClaimDetail>({
    queryKey: ["claims", claimId],
    queryFn: () => fetch(`/api/claims/${claimId}`).then((r) => r.json()),
    enabled: !!claimId,
  });
}
