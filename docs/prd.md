# Product Requirements Document: FastTrack
## AI-Assisted Damage Assessment for Vehicle Claims · Scale Car Insurance
**Author:** James Hicks · **Date:** June 2026

---

## 1. Vision & Goals

*FastTrack* automates the manual review, damage assessment, and estimate generation for vehicle claims, routing each toward approval. It turns a policyholder's photos into a priced, confidence-scored draft estimate the agent can confirm or fix in a couple of minutes. The initial claim submission and final inspection stay as they are today.

For the claims agent, the job shifts from building every estimate from scratch to checking FastTrack's work and handling the calls that need judgment, while the easy claims run automatically.

**Goals**
- **Faster.** Cut estimate time from days to minutes on routine claims, and let the simplest ones clear with no manual touch.
- **Cheaper.** Lower the cost to assess each claim and let one agent get through more. Industry estimates put the savings from this kind of automation at up to 30% of claims expense.
- **More consistent.** Price every claim against the same cost data and confidence model, so the answer doesn't depend on which agent caught it.
- **Safe.** No claim is denied or approved at high value without a person, and every decision is logged.

## 2. Target User & User Stories

The main user is the claims agent, who reviews the damage and builds the estimate. The senior adjuster is a secondary user who approves the claims that get escalated. The policyholder gains from faster claims but never touches this part of the system.

- As a claims agent, I want submitted photos auto-analyzed into a damage summary (parts, damage type, severity) so I don't manually inspect every image.
- As a claims agent, I want a preliminary line-item repair estimate grounded in cost data so I start from a defensible number, not a blank page.
- As a claims agent, I want each claim's confidence score and uncertainty flags to both guide where I focus my review and auto-route the simplest, high-confidence, low-cost claims for fast approval, so my time goes to the cases that actually need me.
- As a claims agent, I want to accept, edit, or override any AI finding inline so I stay in control and the system captures my correction.
- As a senior adjuster, I want escalated high-value or complex claims to arrive with the AI's assessment and the agent's notes already attached, so I can make the final call quickly without redoing the review.
- As a senior adjuster, I want an audit trail of every AI output and agent edit so approvals (and any later dispute) are fully defensible.

## 3. Key Features

**[P0] Claim intake and photo ingestion.** Open or create a claim with the policy number, vehicle, and accident details, then upload the policyholder's photos. If they don't cover the damage well enough, the system asks for better ones.

**[P0] AI damage assessment.** Computer vision finds the affected parts, identifies the type of damage (scratch, dent, structural, glass) and severity, and writes a plain summary per photo and for the claim overall.

**[P0] Preliminary estimate generation.** Turns the damage into the repairs needed (fix or replace each part, plus labor), prices them from standard parts-and-labor data, and produces an itemized estimate with a total. If the cost nears the car's value, it flags the claim as possibly not worth fixing.

**[P0] Confidence scoring and triage.** Each finding and the claim overall get a confidence score, plus any specific doubts. Confidence, estimate size, and fraud flags produce a suggested routing tier.

**[P0] Agent review and override workspace.** The photo and the AI's findings sit side by side; the agent can accept, edit, add, or reject each line and leave notes. All four AI-detected attributes of each finding — damage type, severity, repair action, and part label — are editable inline. The number that counts is the agent's final estimate, not the AI's.

**[P1] Routing and auto-approval.** Claims are assigned to one of four tiers: *auto-approved* (high confidence, low cost, clean), *agent review* (standard review), *low confidence* (flagged for closer agent scrutiny), or *senior adjuster* (high-value, fraud-flagged, or possible total loss). Agents reviewing agent-review or low-confidence claims may escalate to a senior adjuster; claims already at senior-adjuster tier cannot be escalated further.

**[P1] Audit trail and explainability.** Every AI output, confidence score, and human action is logged with a timestamp, so the claim can be explained and defended later.

**[P2: not built yet]** Fraud and anomaly detection, video and multi-angle capture, comparing the estimate to the shop's quote, and feeding agent corrections back to improve the model.

## 4. Prioritization Rationale

P0 features (intake, assessment, estimate, confidence scoring, and the review workspace) form the smallest version of the loop that actually works. Together they ensure a claim can move from photos to a human decision without any piece missing. In v1 a person reviews every claim, so even before any automation the product is already faster and more consistent.

Auto-approval is held to P1 because it's the only step where a claim passes without a person — it stays gated until v1 has shown confidence scores hold up in production. The audit trail waits for the same reason. P2 items sit on top of a loop that has to function first. One rule runs through all of it: nothing ships if it lets the system deny a claim, or approve a high-value one, without a person.

## 5. Success Metrics

**Efficiency.** Average time to produce an estimate, claims handled per agent per day, and the share of claims that clear with no manual review.

**Cost.** Cost to assess a claim, and total claims-handling cost per thousand claims.

**Accuracy.** How far estimates land from the final repair cost, how often agents override the AI (and how large those overrides are), how often claims get reopened, and whether we're systematically paying too much or too little.

**Experience.** Time from photo submission to estimate, plus CSAT — a short rating the policyholder gives after the claim.

**Guardrails.** Whether confidence scores are calibrated (does 90% confidence mean right about 90% of the time), the rate of claims auto-approved that shouldn't have been, and the dispute rate. These can block a launch on their own.

## 6. AI Integration & Human-in-the-Loop

**How the AI works.** A staged pipeline handles each claim: first, check that photos are usable; then a vision model finds damaged parts and rates severity; the system prices repairs from parts-and-labor data and flags possible total losses; a language model writes a readable summary and suggested next step. Each stage carries its own confidence, and if any stage isn't sure, the claim goes to a person.

**How people and the AI split the work.** Confidence, estimate size, and fraud flags decide the routing tier. High-confidence, low-cost, clean claims get auto-approved, with agents spot-checking a sample. Everything else goes to an agent, who gets the AI's assessment as a draft to confirm or change. High-value claims always go to a senior adjuster, however confident the model is. The AI never denies a claim on its own and never has the final say on an expensive one.

---

**Prototype scope.** The prototype covers the agent's path through the loop: open a claim, upload damage photos, and the AI returns a structured assessment (damaged parts, severity, a rough estimate range, a confidence score, and a suggested next step). The agent accepts or overrides each finding, and the claim routes to one of four tiers (auto-approved, agent review, low confidence, or senior adjuster) based on confidence and cost. The demo shows the full loop including auto-approval, though a real rollout would keep auto-approval off until confidence scores prove out. The AI step can run against a real vision model or a mock, so the workflow is the same either way.
