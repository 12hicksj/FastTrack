"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import type { ClaimDetail, AssessmentRecord, FindingRecordSchema } from "@/shared/schemas";
import type { z } from "zod";
import { useSession } from "@/hooks/use-session";
import { useClaim } from "@/hooks/use-claim";
import { StatusBadge } from "@/components/status-badge";
import { TierBadge } from "@/components/tier-badge";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, ArrowUpRight, Loader2 } from "lucide-react";

type Finding = z.infer<typeof FindingRecordSchema>;

function formatMoney(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

// ── Finding row with inline correction editor ─────────────────────────────────

const SEVERITY_OPTIONS = [
  { id: 1, label: "Minor" },
  { id: 2, label: "Moderate" },
  { id: 3, label: "Severe" },
];

const ACTION_OPTIONS = [
  { id: 1, label: "Repair" },
  { id: 2, label: "Replace" },
];

function FindingRow({
  finding,
  canEdit,
  onChange,
}: {
  finding: Finding;
  canEdit: boolean;
  onChange: (id: number, patch: Partial<CorrectionState>) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{finding.partLabel}</span>
            <Badge variant="outline" className="text-xs">{finding.damageType}</Badge>
            <Badge variant="outline" className="text-xs">{finding.severity}</Badge>
            <Badge variant="outline" className="text-xs">{finding.repairAction}</Badge>
          </div>
          <ConfidenceIndicator value={finding.confidence} className="mt-1" />
          {finding.uncertaintyNote && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {finding.uncertaintyNote}
            </p>
          )}
          {finding.correction && (
            <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              Agent override applied
              {finding.correction.note && ` — "${finding.correction.note}"`}
            </div>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
            {editing ? "Done" : "Edit"}
          </Button>
        )}
      </div>

      {editing && canEdit && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 rounded p-3">
          <div className="space-y-1">
            <Label className="text-xs">Part label</Label>
            <Input
              className="h-8 text-xs"
              defaultValue={finding.correction?.correctedPartLabel ?? finding.partLabel}
              onChange={(e) => onChange(finding.findingId, { correctedPartLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select
              defaultValue={String(finding.correction?.correctedSeverityId ?? "")}
              onValueChange={(v) => v && onChange(finding.findingId, { correctedSeverityId: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={finding.severity} />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Repair action</Label>
            <Select
              defaultValue={String(finding.correction?.correctedRepairActionId ?? "")}
              onValueChange={(v) => v && onChange(finding.findingId, { correctedRepairActionId: parseInt(v) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={finding.repairAction} />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs">Note</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Optional note on this correction…"
              defaultValue={finding.correction?.note ?? ""}
              onChange={(e) => onChange(finding.findingId, { note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Correction state map ──────────────────────────────────────────────────────

interface CorrectionState {
  correctedSeverityId?: number;
  correctedRepairActionId?: number;
  correctedPartLabel?: string;
  note?: string;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  initialClaim: ClaimDetail;
  claimId: string;
}

export function ClaimDetail({ initialClaim, claimId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: claim = initialClaim } = useClaim(claimId);

  const [assessing, setAssessing] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, CorrectionState>>({});
  const [reviewDecision, setReviewDecision] = useState<"approved" | "denied" | "escalated">("approved");
  const [finalTotal, setFinalTotal] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const canAssess = (session?.role === "agent" || session?.role === "supervisor") && claim.status === "ready_for_assessment";
  const canReview = (session?.role === "agent" || session?.role === "supervisor") &&
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Link href="/claims" className="hover:text-foreground">Claims</Link>
            <span>/</span>
            <span>{claim.claimNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {claim.claimNumber}
            {claim.fraudFlagged && (
              <span className="flex items-center gap-1 text-red-600 text-base font-normal">
                <AlertTriangle className="h-4 w-4" /> Fraud flagged
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={claim.status} />
          {claim.routing && <TierBadge tier={claim.routing.tier} />}
        </div>
      </div>

      {/* Claim info */}
      <Card>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Vehicle">
              {claim.vehicleYear} {claim.vehicleMake} {claim.vehicleModel}
            </Field>
            <Field label="VIN">{claim.vehicleVin}</Field>
            <Field label="Vehicle value">{formatMoney(claim.vehicleValue)}</Field>
            <Field label="Incident date">
              {new Date(claim.incidentDate).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </Field>
          </dl>
          <Separator className="my-4" />
          <div>
            <dt className="text-xs text-muted-foreground mb-1">Description</dt>
            <dd className="text-sm">{claim.incidentDescription}</dd>
          </div>
        </CardContent>
      </Card>

      {/* Assess button */}
      {canAssess && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed bg-muted/20">
          <div className="flex-1">
            <p className="text-sm font-medium">Ready for AI assessment</p>
            <p className="text-xs text-muted-foreground">
              Run the damage analysis to generate findings and a cost estimate.
            </p>
          </div>
          <Button onClick={runAssessment} disabled={assessing} className="gap-2">
            {assessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {assessing ? "Assessing…" : "Run assessment"}
          </Button>
        </div>
      )}

      {/* Auto-approved banner */}
      {claim.status === "auto_approved" && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            This claim was auto-approved — confidence ≥ 90% and estimate within threshold.
          </p>
        </div>
      )}

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos">Photos ({claim.photos.length})</TabsTrigger>
          {assessment && <TabsTrigger value="assessment">Assessment</TabsTrigger>}
          {assessment && <TabsTrigger value="estimate">Estimate</TabsTrigger>}
          {canReview && <TabsTrigger value="review">Review</TabsTrigger>}
        </TabsList>

        {/* Photos tab */}
        <TabsContent value="photos" className="pt-4">
          {claim.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos attached.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {claim.photos.map((p) => (
                <a key={p.photoId} href={p.storageUrl} target="_blank" rel="noopener noreferrer" className="group">
                  <div className="rounded-lg overflow-hidden border bg-muted aspect-square relative">
                    <img src={p.storageUrl} alt={p.photoTypeName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                      <div className="w-full px-2 py-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <span className="text-[10px] text-white">{p.photoTypeName}</span>
                        <ArrowUpRight className="h-3 w-3 text-white ml-auto" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Assessment tab */}
        {assessment && (
          <TabsContent value="assessment" className="pt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Overall confidence</CardTitle>
                  <ConfidenceIndicator value={assessment.overallConfidence} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{assessment.summary}</p>
                {assessment.possibleTotalLoss && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded p-2 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Possible total loss — repair cost approaches vehicle value.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Findings ({assessment.findings.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {assessment.findings.map((f) => (
                  <div key={f.findingId} className="px-6">
                    <FindingRow
                      finding={f}
                      canEdit={canEditFindings}
                      onChange={updateCorrection}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Estimate tab */}
        {assessment && (
          <TabsContent value="estimate" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Estimate</CardTitle>
                  <span className="text-lg font-bold">{formatMoney(assessment.estimateTotal)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-2.5 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Parts</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Labor</th>
                      <th className="px-6 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assessment.lineItems.map((li) => (
                      <tr key={li.lineItemId}>
                        <td className="px-6 py-2.5">{li.description}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(li.partCost)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {li.laborHours}h × {formatMoney(li.laborRate)}/hr
                        </td>
                        <td className="px-6 py-2.5 text-right tabular-nums font-medium">{formatMoney(li.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 font-semibold">Total estimate</td>
                      <td className="px-6 py-3 text-right font-bold tabular-nums">{formatMoney(assessment.estimateTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Review tab */}
        {canReview && (
          <TabsContent value="review" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Submit review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim.routing && (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
                    Routing: <TierBadge tier={claim.routing.tier} /> · triggered by{" "}
                    <span className="font-mono text-xs">{claim.routing.triggeredBy}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Decision</Label>
                  <div className="flex gap-2">
                    {(["approved", "denied", "escalated"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setReviewDecision(d)}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                          reviewDecision === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-input hover:bg-muted"
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final-total">
                    Final total
                    {assessment && (
                      <span className="ml-1 text-xs text-muted-foreground font-normal">
                        (AI estimate: {formatMoney(assessment.estimateTotal)})
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      id="final-total"
                      className="pl-6"
                      placeholder={assessment ? parseFloat(assessment.estimateTotal).toFixed(2) : "0.00"}
                      value={finalTotal}
                      onChange={(e) => setFinalTotal(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Notes</Label>
                  <Textarea
                    id="review-notes"
                    rows={3}
                    placeholder="Optional notes for the record…"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                <Button onClick={submitReview} disabled={submittingReview} className="gap-2">
                  {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submittingReview ? "Submitting…" : `Submit — ${reviewDecision}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Prior review */}
      {claim.review && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review decision</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Decision">
                <span className="capitalize">{claim.review.decision}</span>
              </Field>
              <Field label="Final total">{formatMoney(claim.review.finalTotal)}</Field>
              <Field label="Reviewed at">
                {new Date(claim.review.reviewedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </Field>
            </dl>
            {claim.review.notes && (
              <>
                <Separator className="my-3" />
                <p className="text-sm text-muted-foreground">{claim.review.notes}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
