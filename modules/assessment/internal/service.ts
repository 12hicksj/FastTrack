import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { assessments, assessmentFindings, damageTypes, severityLevels, repairActions } from "@/db/schema/assessment";
import { claims, claimPhotos } from "@/db/schema/claims";
import { eq, and } from "drizzle-orm";
import { getMockFixture } from "./mock";
import type { AssessmentRecord } from "./types";
import type { AssessmentResponse } from "@/shared/schemas";

type VisionFixture = Omit<AssessmentResponse, "claimId">;

const SYSTEM_PROMPT = `You are an expert vehicle damage assessor for an auto insurance company. Analyze all provided vehicle photos together and return a structured damage assessment as a single JSON object.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation:
{
  "overallConfidence": <number 0.0–1.0>,
  "summary": "<plain-English summary of all damage found across all photos>",
  "findings": [
    {
      "partLabel": "<specific part name, e.g. Driver-Side Door, Front Bumper Cover>",
      "damageType": "<one of: scratch, dent, structural, glass>",
      "severity": "<one of: minor, moderate, severe>",
      "repairAction": "<one of: repair, replace>",
      "confidence": <number 0.0–1.0>,
      "uncertaintyNote": "<string describing uncertainty, or null>"
    }
  ],
  "photoQuality": {
    "<exact_photo_url>": <true if clear and usable, false if blurry/dark/unusable>
  }
}

Guidelines:
- Cross-reference all photos. When multiple angles confirm the same damaged part, report it once and raise confidence.
- Be specific with partLabel (e.g. "Rear Quarter Panel" not "Side").
- overallConfidence reflects certainty across all findings combined.
- Populate photoQuality for every URL passed in the user message.`;

function validateDamageType(t: string): "scratch" | "dent" | "structural" | "glass" {
  if (["scratch", "dent", "structural", "glass"].includes(t)) return t as "scratch" | "dent" | "structural" | "glass";
  return "dent";
}

function validateSeverity(t: string): "minor" | "moderate" | "severe" {
  if (["minor", "moderate", "severe"].includes(t)) return t as "minor" | "moderate" | "severe";
  return "moderate";
}

function validateRepairAction(t: string): "repair" | "replace" {
  if (["repair", "replace"].includes(t)) return t as "repair" | "replace";
  return "repair";
}

async function callVision(
  claimNumber: string,
  photoUrls: string[]
): Promise<{ assessment: VisionFixture; photoQuality: Record<string, boolean> }> {
  const useMock = process.env.MOCK_VISION === "true" || !process.env.ANTHROPIC_API_KEY;

  if (useMock) {
    return { assessment: getMockFixture(claimNumber), photoQuality: {} };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const imageBlocks: Anthropic.ImageBlockParam[] = photoUrls.map((url) => ({
      type: "image",
      source: { type: "url", url },
    }));

    const textBlock: Anthropic.TextBlockParam = {
      type: "text",
      text: `Assess all damage visible across these ${photoUrls.length} photos for claim ${claimNumber}.\n\nPhoto URLs (use these exact strings as keys in photoQuality):\n${photoUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}`,
    };

    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: [...imageBlocks, textBlock] }],
    });

    const message = await stream.finalMessage();

    const responseText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Strip markdown code fences if Claude wraps the JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in Claude response");

    const parsed = JSON.parse(jsonMatch[0]);

    const assessment: VisionFixture = {
      source: "real",
      modelVersion: "claude-opus-4-8",
      overallConfidence: Math.min(1, Math.max(0, Number(parsed.overallConfidence) || 0.7)),
      summary: String(parsed.summary || "Assessment complete."),
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map((f: Record<string, unknown>) => ({
            partLabel: String(f.partLabel || "Unknown part"),
            damageType: validateDamageType(String(f.damageType || "")),
            severity: validateSeverity(String(f.severity || "")),
            repairAction: validateRepairAction(String(f.repairAction || "")),
            confidence: Math.min(1, Math.max(0, Number(f.confidence) || 0.7)),
            uncertaintyNote: f.uncertaintyNote ? String(f.uncertaintyNote) : null,
          }))
        : [],
    };

    const photoQuality: Record<string, boolean> = {};
    if (parsed.photoQuality && typeof parsed.photoQuality === "object") {
      for (const [url, usable] of Object.entries(parsed.photoQuality)) {
        photoQuality[url] = Boolean(usable);
      }
    }

    return { assessment, photoQuality };
  } catch (err) {
    console.error("[assessment] Claude vision error — falling back to mock:", err);
    return { assessment: getMockFixture(claimNumber), photoQuality: {} };
  }
}

export async function runAssessment(claimId: string): Promise<AssessmentRecord> {
  // Load claim
  const claimRows = await db
    .select({ claimNumber: claims.claimNumber })
    .from(claims)
    .where(eq(claims.claimId, claimId))
    .limit(1);

  if (!claimRows[0]) throw new Error(`Claim ${claimId} not found`);
  const { claimNumber } = claimRows[0];

  // Load photos
  const photos = await db
    .select({ photoId: claimPhotos.photoId, storageUrl: claimPhotos.storageUrl })
    .from(claimPhotos)
    .where(eq(claimPhotos.claimId, claimId));

  const photoUrls = photos.map((p) => p.storageUrl);

  // Mark previous assessments as no longer current
  await db
    .update(assessments)
    .set({ isCurrent: false })
    .where(and(eq(assessments.claimId, claimId), eq(assessments.isCurrent, true)));

  // Get next version number
  const existing = await db
    .select({ version: assessments.version })
    .from(assessments)
    .where(eq(assessments.claimId, claimId));
  const nextVersion = existing.length + 1;

  // Call vision (mock or real)
  const { assessment: response, photoQuality } = await callVision(claimNumber, photoUrls);

  // Update photo quality flags from Claude's per-photo assessment
  for (const photo of photos) {
    if (photo.storageUrl in photoQuality) {
      await db
        .update(claimPhotos)
        .set({ qualityCheckPassed: photoQuality[photo.storageUrl] })
        .where(eq(claimPhotos.photoId, photo.photoId));
    }
  }

  // Persist assessment
  const [assessment] = await db
    .insert(assessments)
    .values({
      claimId,
      version: nextVersion,
      source: response.source,
      modelVersion: response.modelVersion,
      overallConfidence: response.overallConfidence.toFixed(4),
      summary: response.summary,
      isCurrent: true,
    })
    .returning();

  // Load lookup maps once
  const [dtRows, svRows, raRows] = await Promise.all([
    db.select().from(damageTypes),
    db.select().from(severityLevels),
    db.select().from(repairActions),
  ]);
  const dtMap = Object.fromEntries(dtRows.map((r) => [r.name, r.damageTypeId]));
  const svMap = Object.fromEntries(svRows.map((r) => [r.name, r.severityId]));
  const raMap = Object.fromEntries(raRows.map((r) => [r.name, r.repairActionId]));

  // Persist findings
  const findingRecords = [];
  for (const f of response.findings) {
    const [finding] = await db
      .insert(assessmentFindings)
      .values({
        assessmentId: assessment.assessmentId,
        damageTypeId: dtMap[f.damageType],
        severityId: svMap[f.severity],
        repairActionId: raMap[f.repairAction],
        partLabel: f.partLabel,
        confidence: f.confidence.toFixed(4),
        uncertaintyNote: f.uncertaintyNote ?? null,
      })
      .returning();

    findingRecords.push({
      findingId: finding.findingId,
      partLabel: finding.partLabel,
      damageTypeName: f.damageType,
      severityName: f.severity,
      repairActionName: f.repairAction,
      confidence: finding.confidence,
      uncertaintyNote: finding.uncertaintyNote,
    });
  }

  return {
    assessmentId: assessment.assessmentId,
    claimId,
    version: assessment.version,
    source: assessment.source,
    modelVersion: assessment.modelVersion,
    overallConfidence: assessment.overallConfidence,
    summary: assessment.summary,
    isCurrent: true,
    createdAt: assessment.createdAt,
    findings: findingRecords,
    lineItems: [],
  };
}

export async function getCurrentAssessment(
  claimId: string
): Promise<AssessmentRecord | null> {
  const rows = await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.claimId, claimId), eq(assessments.isCurrent, true)))
    .limit(1);

  if (!rows[0]) return null;
  const a = rows[0];

  const findings = await db
    .select({
      findingId: assessmentFindings.findingId,
      partLabel: assessmentFindings.partLabel,
      confidence: assessmentFindings.confidence,
      uncertaintyNote: assessmentFindings.uncertaintyNote,
      damageTypeName: damageTypes.name,
      severityName: severityLevels.name,
      repairActionName: repairActions.name,
    })
    .from(assessmentFindings)
    .innerJoin(damageTypes, eq(assessmentFindings.damageTypeId, damageTypes.damageTypeId))
    .innerJoin(severityLevels, eq(assessmentFindings.severityId, severityLevels.severityId))
    .innerJoin(repairActions, eq(assessmentFindings.repairActionId, repairActions.repairActionId))
    .where(eq(assessmentFindings.assessmentId, a.assessmentId));

  return {
    assessmentId: a.assessmentId,
    claimId,
    version: a.version,
    source: a.source,
    modelVersion: a.modelVersion,
    overallConfidence: a.overallConfidence,
    summary: a.summary,
    isCurrent: a.isCurrent,
    createdAt: a.createdAt,
    findings: findings.map((f) => ({
      findingId: f.findingId,
      partLabel: f.partLabel,
      damageTypeName: f.damageTypeName,
      severityName: f.severityName,
      repairActionName: f.repairActionName,
      confidence: f.confidence,
      uncertaintyNote: f.uncertaintyNote,
    })),
    lineItems: [],
  };
}
