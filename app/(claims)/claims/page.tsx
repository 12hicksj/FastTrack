"use client";

import Link from "next/link";
import { useClaims } from "@/hooks/use-claims";
import { useSession } from "@/hooks/use-session";
import { StatusBadge } from "@/components/status-badge";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

function formatMoney(val: string | null) {
  if (!val) return "—";
  return `$${parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClaimsQueuePage() {
  const { data: session } = useSession();
  const { data: claims, isLoading, error } = useClaims();

  const canSubmit = session?.role === "customer" || session?.role === "agent" || session?.role === "supervisor";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claims</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {session?.role === "customer" ? "Your submitted claims" : "Claims assigned to you"}
          </p>
        </div>
        {canSubmit && (
          <Link href="/claims/new" className={buttonVariants()}>
            New Claim
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-destructive text-sm">Failed to load claims.</div>
      )}

      {claims && claims.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          No claims found.
        </div>
      )}

      {claims && claims.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Claim</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Routing</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Estimate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {claims.map((c) => (
                <tr key={c.claimId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/claims/${c.claimId}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1.5"
                    >
                      {c.claimNumber}
                      {c.fraudFlagged && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Fraud flagged" />
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.vehicleYear} {c.vehicleMake} {c.vehicleModel}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.routingTier ? <TierBadge tier={c.routingTier} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(c.estimateTotal)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.incidentDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
