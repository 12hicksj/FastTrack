"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useClaims } from "@/hooks/use-claims";
import { useSession } from "@/hooks/use-session";
import { StatusBadge } from "@/components/status-badge";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import type { ClaimSummary } from "@/shared/schemas";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const STATUS_LABELS: Record<string, string> = {
  draft:                 "Draft",
  ready_for_assessment:  "Ready",
  assessed:              "Assessed",
  routed:                "Routed",
  in_review:             "In review",
  approved:              "Approved",
  denied:                "Denied",
  escalated:             "Escalated",
  closed:                "Closed",
};

const TIER_LABELS: Record<string, string> = {
  auto_approved:              "Auto-Approved",
  agent_review:               "Agent Review",
  senior_adjuster:            "Senior Adjuster",
  confidence_below_threshold: "Low Confidence",
};

type SortKey = "claimNumber" | "incidentDate" | "estimateTotal" | "reviewFinalTotal" | "status" | "routingTier";

function sortClaims(claims: ClaimSummary[], key: SortKey, dir: "asc" | "desc"): ClaimSummary[] {
  return [...claims].sort((a, b) => {
    let aVal: string | number | null;
    let bVal: string | number | null;

    switch (key) {
      case "claimNumber":   aVal = a.claimNumber;   bVal = b.claimNumber;   break;
      case "incidentDate":  aVal = a.incidentDate;  bVal = b.incidentDate;  break;
      case "status":        aVal = a.status;         bVal = b.status;        break;
      case "routingTier":   aVal = a.routingTier ?? ""; bVal = b.routingTier ?? ""; break;
      case "estimateTotal":
        aVal = a.estimateTotal ? parseFloat(a.estimateTotal) : -1;
        bVal = b.estimateTotal ? parseFloat(b.estimateTotal) : -1;
        break;
      case "reviewFinalTotal":
        aVal = a.reviewFinalTotal ? parseFloat(a.reviewFinalTotal) : -1;
        bVal = b.reviewFinalTotal ? parseFloat(b.reviewFinalTotal) : -1;
        break;
      default: return 0;
    }

    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortTh({
  label,
  sortK,
  activeKey,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortK: SortKey;
  activeKey: SortKey | null;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = activeKey === sortK;
  return (
    <th className={`px-4 py-2.5 text-${align} text-xs font-medium text-muted-foreground`}>
      <button
        onClick={() => onSort(sortK)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-35" />
        )}
      </button>
    </th>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClaimsQueuePage() {
  const { data: session } = useSession();
  const { data: claims, isLoading, error } = useClaims();

  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTier, setFilterTier]   = useState("");
  const [sortKey, setSortKey]         = useState<SortKey | null>("incidentDate");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const processed = useMemo(() => {
    if (!claims) return [];
    let rows = claims.filter((c) => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterTier && c.routingTier !== filterTier) return false;
      if (search) {
        const q = search.toLowerCase();
        const vehicle = `${c.vehicleYear} ${c.vehicleMake} ${c.vehicleModel}`.toLowerCase();
        const customer = `${c.customerFirstName} ${c.customerLastName}`.toLowerCase();
        if (
          !c.claimNumber.toLowerCase().includes(q) &&
          !vehicle.includes(q) &&
          !customer.includes(q)
        ) return false;
      }
      return true;
    });
    if (sortKey) rows = sortClaims(rows, sortKey, sortDir);
    return rows;
  }, [claims, search, filterStatus, filterTier, sortKey, sortDir]);

  const canSubmit = !!session;
  const isAgent   = session?.role === "agent" || session?.role === "supervisor";

  const activeFilters = [search, filterStatus, filterTier].filter(Boolean).length;

  // Unique statuses + tiers present in the data (for filter dropdowns)
  const statusOptions = useMemo(() => {
    const seen = new Set(claims?.map((c) => c.status) ?? []);
    return [...seen].sort().map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }));
  }, [claims]);

  const tierOptions = useMemo(() => {
    const seen = new Set(
      (claims ?? []).map((c) => c.routingTier).filter((t): t is string => !!t)
    );
    return [...seen].sort().map((t) => ({ value: t, label: TIER_LABELS[t] ?? t }));
  }, [claims]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Claims</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {session?.role === "customer" ? "Your submitted claims" : "Claims queue"}
          </p>
        </div>
        {canSubmit && (
          <Link href="/claims/new" className={buttonVariants({ size: "sm" }) + " gap-1.5"}>
            <Plus className="h-3.5 w-3.5" />
            New claim
          </Link>
        )}
      </div>

      {/* Filter / search bar */}
      {!isLoading && !error && claims && claims.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search claim, vehicle, customer…"
              className="h-8 text-xs pr-7"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={statusOptions}
            placeholder="All statuses"
          />
          <FilterSelect
            value={filterTier}
            onChange={setFilterTier}
            options={tierOptions}
            placeholder="All tiers"
          />
          {activeFilters > 0 && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setFilterTier(""); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {processed.length} of {claims.length}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="rounded-xl border border-border overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-b last:border-0">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">Failed to load claims.</p>}

      {!isLoading && claims && claims.length === 0 && (
        <div className="text-center py-20 text-muted-foreground text-sm">No claims yet.</div>
      )}

      {!isLoading && claims && claims.length > 0 && processed.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No claims match the current filters.
        </div>
      )}

      {processed.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortTh label="Claim"    sortK="claimNumber"   activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                {isAgent && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Customer
                  </th>
                )}
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Vehicle
                </th>
                <SortTh label="Status"   sortK="status"        activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Routing"  sortK="routingTier"   activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Estimate" sortK="estimateTotal"      activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                <SortTh label="Approved" sortK="reviewFinalTotal"   activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                <SortTh label="Date"     sortK="incidentDate"       activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processed.map((c) => (
                <tr key={c.claimId} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/claims/${c.claimId}`}
                      className="font-mono text-sm font-medium hover:underline underline-offset-2 flex items-center gap-1.5"
                    >
                      {c.claimNumber}
                      {c.fraudFlagged && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Fraud flag" />
                      )}
                    </Link>
                  </td>
                  {isAgent && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.customerFirstName} {c.customerLastName}
                    </td>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.vehicleYear} {c.vehicleMake} {c.vehicleModel}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.routingTier ? <TierBadge tier={c.routingTier} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(c.estimateTotal)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(c.reviewFinalTotal)}</td>
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
