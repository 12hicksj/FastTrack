"use client";

import Link from "next/link";
import { useClaims } from "@/hooks/use-claims";
import { useSession } from "@/hooks/use-session";
import { StatusBadge } from "@/components/status-badge";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus } from "lucide-react";

function formatMoney(val: string | null) {
  if (!val) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono">
      ${parseFloat(val).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

export default function ClaimsQueuePage() {
  const { data: session } = useSession();
  const { data: claims, isLoading, error } = useClaims();

  const canSubmit =
    session?.role === "customer" ||
    session?.role === "agent" ||
    session?.role === "supervisor";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Claims</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {session?.role === "customer"
              ? "Your submitted claims"
              : "Claims queue"}
          </p>
        </div>
        {canSubmit && (
          <Link
            href="/claims/new"
            className={buttonVariants({ size: "sm" }) + " gap-1.5"}
          >
            <Plus className="h-3.5 w-3.5" />
            New claim
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-b last:border-0">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load claims.</p>
      )}

      {claims && claims.length === 0 && !isLoading && (
        <div className="text-center py-20 text-muted-foreground text-sm">
          No claims yet.
        </div>
      )}

      {claims && claims.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Claim
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Vehicle
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Routing
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Estimate
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {claims.map((c) => (
                <tr
                  key={c.claimId}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/claims/${c.claimId}`}
                      className="font-mono text-sm font-medium hover:underline underline-offset-2 flex items-center gap-1.5"
                    >
                      {c.claimNumber}
                      {c.fraudFlagged && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-red-500"
                          aria-label="Fraud flag"
                        />
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
                    {c.routingTier ? (
                      <TierBadge tier={c.routingTier} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(c.estimateTotal)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
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
