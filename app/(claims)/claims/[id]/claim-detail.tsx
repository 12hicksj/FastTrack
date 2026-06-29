"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import type { ClaimDetail, FindingRecordSchema } from "@/shared/schemas";
import type { z } from "zod";
import { useSession } from "@/hooks/use-session";
import { useClaim } from "@/hooks/use-claim";
import { StatusBadge } from "@/components/status-badge";
import { TierBadge } from "@/components/tier-badge";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  ChevronRight,
} from "lucide-react";

type Finding = z.infer<typeof FindingRecordSchema>;

function fmt(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetaField({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {children}
      </dd>
    </div>
  );
}

// ── Severity / action options ─────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { id: 1, label: "Minor" },
  { id: 2, label: "Moderate" },
  { id: 3, label: "Severe" },
];

const ACTION_OPTIONS = [
  { id: 1, label: "Repair" },
  { id: 2, label: "Replace" },
];

// ── Inline finding editor ─────────────────────────────────────────────────────

interface CorrectionState {
  correctedSeverityId?: number;
  correctedRepairActionId?: number;
  correctedPartLabel?: string;
  note?: string;
}

function FindingRow({
  finding,
  canEdit,
  onChange,
}: {
  finding: Finding;
  canEdit: boolean;
  onChange: (id: number, patch: Partial<CorrectionState>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{finding.partLabel}</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
              {finding.damageType}
            </span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
              {finding.severity}
            </span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">
              {finding.repairAction}
            </span>
          </div>
          <ConfidenceIndicator value={finding.confidence} />
          {finding.uncertaintyNote && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {finding.uncertaintyNote}
            </p>
          )}
          {finding.correction && (
            <p className="text-xs text-muted-foreground italic">
              Agent correction applied
              {finding.correction.note ? ` — "${finding.correction.note}"` : ""}
            </p>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {open ? "Done" : "Edit"}
          </button>
        )}
      </div>

      {open && canEdit && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Part label</Label>
            <Input
              className="h-7 text-xs"
              defaultValue={finding.correction?.correctedPartLabel ?? finding.partLabel}
              onChange={(e) =>
                onChange(finding.findingId, { correctedPartLabel: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Severity</Label>
            <Select
              defaultValue={String(finding.correction?.correctedSeverityId ?? "")}
              onValueChange={(v) =>
                v && onChange(finding.findingId, { correctedSeverityId: parseInt(v) })
              }
            >
              <SelectTrigger className="h-7 text-xs w-full">
                <SelectValue placeholder={finding.severity} />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Repair action</Label>
            <Select
              defaultValue={String(finding.correction?.correctedRepairActionId ?? "")}
              onValueChange={(v) =>
                v && onChange(finding.findingId, { correctedRepairActionId: parseInt(v) })
              }
            >
              <SelectTrigger className="h-7 text-xs w-full">
                <SelectValue placeholder={finding.repairAction} />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Note</Label>
            <Input
              className="h-7 text-xs"
              placeholder="Optional note…"
              defaultValue={finding.correction?.note ?? ""}
              onChange={(e) =>
                onChange(finding.findingId, { note: e.target.value })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ClaimDetail({
  initialClaim,
  claimId,
}: {
  initialClaim: ClaimDetail;
  claimId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: claim = initialClaim } = useClaim(claimId);

  const [assessing, setAssessing] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, CorrectionState>>({});
  const [reviewDecision, setReviewDecision] = useState<"approved" | "denied" | "escalated">(
    "approved"
  );
  const [finalTotal, setFinalTotal] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const canAssess =
    (session?.role === "agent" || session?.role === "supervisor") &&
    claim.status === "ready_for_assessment";
  const canReview =
    (session?.role === "agent" || session?.role === "supervisor") &&
    ["routed", "in_review", "escalated"].includes(claim.status);
  const canEditFindings = canReview && !!claim.assessment;

  function updateCorrection(findingId: number, patch: Partial<CorrectionState>) {
    setCorrections((prev) => ({
      ...prev,
      [findingId]: { ...prev[findingId], ...patch },
    }));
  }

  async function runAssessment() {
    setAssessing(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/assess`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Assessment failed");
      }
      toast.success("Assessment complete.");
      queryClient.invalidateQueries({ queryKey: ["claims", claimId] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assessment failed.");
    } finally {
      setAssessing(false);
    }
  }

  async function submitReview() {
    if (!claim.assessment) return;
    const effectiveTotal = finalTotal || claim.assessment.estimateTotal;
    if (!/^\d+(\.\d{1,2})?$/.test(effectiveTotal)) {
      toast.error("Final total must be a valid dollar amount (e.g. 1234.56).");
      return;
    }
    const correctionList = Object.entries(corrections)
      .filter(([, v]) => Object.keys(v).length > 0)
      .map(([id, v]) => ({ findingId: parseInt(id), ...v }));

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: reviewDecision,
          finalTotal: effectiveTotal,
          notes: reviewNotes || undefined,
          corrections: correctionList.length > 0 ? correctionList : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Review failed");
      }
      toast.success(`Claim ${reviewDecision}.`);
      queryClient.invalidateQueries({ queryKey: ["claims", claimId] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setSubmittingReview(false);
    }
  }

  const assessment = claim.assessment;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/claims" className="hover:text-foreground transition-colors">
            Claims
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-mono">{claim.claimNumber}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold font-mono tracking-tight">
              {claim.claimNumber}
            </h1>
            {claim.fraudFlagged && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                Fraud flag
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={claim.status} />
            {claim.routing && <TierBadge tier={claim.routing.tier} />}
          </div>
        </div>
      </div>

      {/* Vehicle + incident meta */}
      <div className="rounded-xl border border-border p-4 space-y-4">
        <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <MetaField label="Year" mono>
            {claim.vehicleYear}
          </MetaField>
          <MetaField label="Make">{claim.vehicleMake}</MetaField>
          <MetaField label="Model">{claim.vehicleModel}</MetaField>
          <MetaField label="VIN" mono>
            {claim.vehicleVin}
          </MetaField>
          <MetaField label="Value" mono>
            {fmt(claim.vehicleValue)}
          </MetaField>
        </dl>
        <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetaField label="Incident date">
            {new Date(claim.incidentDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </MetaField>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground mb-0.5">Description</dt>
            <dd className="text-sm leading-relaxed">{claim.incidentDescription}</dd>
          </div>
        </div>
      </div>

      {/* Auto-approved banner */}
      {claim.status === "auto_approved" && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-4 py-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">
            Auto-approved — confidence ≥ 90% and estimate within threshold.
          </p>
        </div>
      )}

      {/* Assess CTA */}
      {canAssess && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Ready for assessment</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Run AI damage analysis to generate findings and a repair estimate.
            </p>
          </div>
          <Button size="sm" onClick={runAssessment} disabled={assessing} className="gap-1.5 shrink-0">
            {assessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {assessing ? "Assessing…" : "Run assessment"}
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="photos">
        <TabsList variant="line" className="w-full border-b border-border rounded-none pb-0 h-auto gap-0">
          <TabsTrigger value="photos" className="rounded-none px-3 pb-2.5">
            Photos ({claim.photos.length})
          </TabsTrigger>
          {assessment && (
            <TabsTrigger value="assessment" className="rounded-none px-3 pb-2.5">
              Assessment
            </TabsTrigger>
          )}
          {assessment && (
            <TabsTrigger value="estimate" className="rounded-none px-3 pb-2.5">
              Estimate
            </TabsTrigger>
          )}
          {canReview && (
            <TabsTrigger value="review" className="rounded-none px-3 pb-2.5">
              Review
            </TabsTrigger>
          )}
        </TabsList>

        {/* Photos */}
        <TabsContent value="photos" className="pt-5">
          {claim.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos attached.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {claim.photos.map((p) => (
                <a
                  key={p.photoId}
                  href={p.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={p.storageUrl}
                      alt={p.photoTypeName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-full bg-black/50 px-2 py-1 flex items-center gap-1">
                        <span className="text-[10px] text-white truncate">
                          {p.photoTypeName.replace(/_/g, " ")}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-white ml-auto shrink-0" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assessment */}
        {assessment && (
          <TabsContent value="assessment" className="pt-5 space-y-5">
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall confidence</span>
                <ConfidenceIndicator value={assessment.overallConfidence} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {assessment.summary}
              </p>
              {assessment.possibleTotalLoss && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-3 py-2 text-red-700 dark:text-red-400 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Possible total loss — repair cost approaches vehicle value
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">
                  Findings ({assessment.findings.length})
                </span>
              </div>
              <div className="divide-y divide-border">
                {assessment.findings.map((f) => (
                  <div key={f.findingId} className="px-4">
                    <FindingRow
                      finding={f}
                      canEdit={canEditFindings}
                      onChange={updateCorrection}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* Estimate */}
        {assessment && (
          <TabsContent value="estimate" className="pt-5">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Line items
                </span>
                <span className="text-sm font-semibold font-mono">
                  {fmt(assessment.estimateTotal)}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Parts
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Labor
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assessment.lineItems.map((li) => (
                    <tr key={li.lineItemId}>
                      <td className="px-4 py-2.5">{li.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {fmt(li.partCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-xs">
                        {li.laborHours}h × {fmt(li.laborRate)}/hr
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">
                        {fmt(li.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {fmt(assessment.estimateTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>
        )}

        {/* Review */}
        {canReview && (
          <TabsContent value="review" className="pt-5">
            <div className="rounded-xl border border-border p-4 space-y-5 max-w-md">
              {claim.routing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TierBadge tier={claim.routing.tier} />
                  <span className="text-border">·</span>
                  <span className="font-mono">{claim.routing.triggeredBy}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Decision</Label>
                <div className="flex gap-2">
                  {(["approved", "denied", "escalated"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setReviewDecision(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        reviewDecision === d
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="final-total" className="text-xs text-muted-foreground">
                  Final total
                  {assessment && (
                    <span className="ml-1 font-normal">
                      (AI estimate: {fmt(assessment.estimateTotal)})
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="final-total"
                    className="pl-6 font-mono"
                    placeholder={
                      assessment ? parseFloat(assessment.estimateTotal).toFixed(2) : "0.00"
                    }
                    value={finalTotal}
                    onChange={(e) => setFinalTotal(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes" className="text-xs text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="review-notes"
                  rows={3}
                  placeholder="Optional notes for the record…"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>

              <Button
                size="sm"
                onClick={submitReview}
                disabled={submittingReview}
                className="gap-1.5 w-full"
              >
                {submittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submittingReview ? "Submitting…" : `Submit — ${reviewDecision}`}
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Prior review result */}
      {claim.review && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Review decision
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetaField label="Decision">
              <span className="capitalize">{claim.review.decision}</span>
            </MetaField>
            <MetaField label="Final total" mono>
              {fmt(claim.review.finalTotal)}
            </MetaField>
            <MetaField label="Reviewed">
              {new Date(claim.review.reviewedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </MetaField>
          </dl>
          {claim.review.notes && (
            <p className="text-sm text-muted-foreground border-t border-border pt-3">
              {claim.review.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
