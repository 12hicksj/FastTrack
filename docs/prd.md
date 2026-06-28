# Product Requirements Document: FastTrack
## AI-Assisted Damage Assessment for Vehicle Claims · Scale Car Insurance
**Author:** James Hicks · **Date:** June 2026

---

## 1. Vision & Goals

Today, the slowest and most expensive part of settling a vehicle-damage claim is the step where a person sits with the photos and works out what the repair will cost. After a Scale Car Insurance policyholder reports an accident and sends in pictures, a claims agent goes through every image individually, estimates the repair cost from experience and reference manuals, and passes the file to a senior adjuster for approval. That can take days, tie up agent time, and produce different results from different agents, which leads the company to over- or under-pay. As it works today, the only way to handle more claims is to hire more people.

*FastTrack* automates the manual review, damage assessment, and estimate generation, and routes each claim toward approval. It turns the policyholder's photos into a priced, confidence-scored draft estimate the agent can confirm or fix in a couple of minutes. The initial claim submission and damage documentation, and the repair and final inspection, stay as they are today.

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

**[P0] Claim intake and photo ingestion.** Open or create a claim with the policy number, vehicle, and accident details, then upload the policyholder's photos. If they don't cover the damage well enough, the system asks for better ones (the four corners, close-ups of each damaged area, plus the VIN and odometer).

**[P0] AI damage assessment.** Computer vision finds the affected parts, says what kind of damage it is (scratch, dent, structural, glass) and how bad, and writes a plain summary per photo and for the claim overall.

**[P0] Preliminary estimate generation.** Turns the damage into the repairs needed (fix or replace each part, plus labor), prices them from standard parts-and-labor data, and produces an itemized estimate with a total. If the cost nears the car's value, it flags the claim as possibly not worth fixing.

**[P0] Confidence scoring and triage.** Each finding and the claim overall get a confidence score, plus any specific doubts (for example, "might be hidden structural damage the photo angle doesn't show"). Confidence, estimate size, and fraud flags produce a suggested routing tier, acted on automatically only once auto-approval is on in P1.

**[P0] Agent review and override workspace.** The photo and the AI's findings sit side by side; the agent can accept, edit, add, or reject each line and leave notes. The number that counts is the agent's final estimate, not the AI's.

**[P1] Routing and auto-approval.** High-confidence, low-cost, fraud-clean claims get auto-approved; everything else goes to an agent, and high-value claims always go to a senior adjuster.

**[P1] Audit trail and explainability.** Every AI output, confidence score, and human action is logged with a timestamp, so the claim can be explained and defended later.

**[P2: not built yet]** Out of scope for now but worth doing later: fraud and anomaly checks (damage that doesn't match the report, old damage passed off as new, edited photos), video and multi-angle capture, checking photos against vehicle data, comparing the estimate to the shop's own quote, and feeding agent corrections back in to keep improving the model.

## 4. Prioritization Rationale

I'm using three priority levels mapped to the MoSCoW scheme (Must have, Should have, Could have, Won't have). P0 is the Must haves, the things the product can't ship without. P1 is the Should haves, important and next in line, but only worth turning on once P0 has earned trust. P2 is the Could haves: real and worth building, just later rather than in the first version.

What makes something P0 is mostly necessity: can a claim still get through the loop, with a person owning the decision, if this piece is missing? If not, it's P0. After that I weigh what depends on what, then value against effort and risk.

That's why five features sit at P0. Together they're the smallest version of the loop that actually works: intake gets the claim and photos in, the assessment and estimate produce something useful, confidence scoring tells the agent which claims to trust, and the review screen lets them correct it. Drop any one and the claim either can't move or isn't safe to act on. In v1 a person reviews every claim, so even before any automation, the product is already faster and more consistent.

Auto-approval is held to P1 on purpose. It's the only step where a claim passes without a person, so it stays gated until v1 has shown the confidence scores hold up in production. It's also where most of the efficiency comes from, which is exactly why it has to earn that trust first. The audit trail waits for the same reason. The P2 work sits on top of a loop that has to function first, and several items carry their own accuracy and compliance questions. One rule runs through all of it: nothing ships if it lets the system deny a claim, or approve a high-value one, without a person.

## 5. Success Metrics

**Efficiency.** Average time to produce an estimate, claims handled per agent per day, and the share of claims that clear with no manual review. That last number is the one I'd watch most closely as automation ramps up.

**Cost.** Cost to assess a claim, and total claims-handling cost per thousand claims.

**Accuracy.** How far estimates land from the final repair cost, how often agents override the AI (and how big those overrides are, which tells me how much they trust it), how often claims get reopened, and whether we're systematically paying too much or too little.

**Experience.** Time from photo submission to estimate, plus CSAT (Customer Satisfaction Score), a short rating the policyholder gives after the claim. It's the check that the efficiency gains actually reach the customer, and that faster, automated handling is improving the experience rather than quietly degrading it.

**Guardrails.** Whether the confidence scores are honest (does 90% confidence actually mean right about 90% of the time), the rate of claims auto-approved that shouldn't have been (capped, with a ceiling we hold to), the dispute rate, and once fraud detection ships, how much fraud we catch.

These guardrails can block a launch on their own. A version that's faster but waves through claims it shouldn't is not an improvement.

## 6. AI Integration & Human-in-the-Loop

**How the AI works.** I'd build this as a few stages rather than one model doing everything in a single pass. First, check the photos are usable: clear, complete, and not edited. Then a vision model finds the vehicle and the damaged parts and rates how bad each one is. The system maps that damage to the repairs needed, prices them against standard parts-and-labor data, and checks whether the cost is nearing the car's value. Finally, a language model writes a readable summary and a suggested next step. Each stage carries its own confidence, and if any stage isn't sure, the claim goes to a person.

**Models.** I'd start with a strong general model so the product ships fast, then specialize it as labeled claim data builds up. The human stays in the loop for a simple reason: accuracy holds up on clear damage but drops on the hard cases (small dents, hidden or structural damage, bad photos), and those are exactly the claims you can't afford to get wrong. That's a permanent design choice, not a stopgap.

**How people and the AI split the work.** Confidence, the size of the estimate, and any fraud flags decide where each claim goes. High-confidence, low-cost, clean claims get auto-approved, with the agent spot-checking a sample. Everything else goes to the agent, who gets the AI's assessment as a draft to confirm or change. High-value claims always go to a senior adjuster, however confident the model is. The AI never denies a claim on its own and never has the final say on an expensive one. And every agent correction becomes training data, so the routine review work quietly makes the model better over time.

**Fairness, privacy, and compliance.** A few things I'd watch from day one. Accuracy has to hold across vehicle types, regions, and price ranges, so the model doesn't quietly disadvantage some customers. Every assessment should be explainable, and a policyholder can always ask for a human to look again. Personal details in photos, and any location data, get clear retention limits. To keep agents from rubber-stamping the AI, we track confidence and override patterns. And the system is built to meet insurers' fairness and transparency rules, with the audit trail as the record of how each decision was made.

---

**Prototype scope.** The prototype covers the agent's path through the loop: open a claim, upload damage photos, and the AI returns a structured assessment (damaged parts, severity, a rough estimate range, a confidence score, and a suggested next step). The agent accepts or overrides each finding, and the claim routes to one of three places (auto-approved, agent review, or senior adjuster) based on confidence and cost. The demo shows the whole loop including auto-approval, though a real rollout would keep auto-approval off until the confidence scores prove out. The AI step can run against a real vision model or a mock, so the workflow is the same either way. The prototype prioritizes a clear, intuitive flow for the agent over visual polish: the experience should make the assessment easy to read and the review and override obvious, so the agent can move through a claim quickly and stay in control.
