# Wenura Security Requirements

**Status:** Draft
**Scope:** Security architecture for Wenura — an AI-native browser with an internal Domo agent
**Source material:** Domo `PRD.md` (V1, 7 items, implemented) and `REQUIREMENTS.md` FR-8 (event registry + pre-action gates) are direct inputs. Domo `ACTION_SECURITY_REQUIREMENTS.md` is a **separate product** — Domo as a standalone security web agent — from which Wenura borrows ideas (T0–T3 tiers, capability leases, fail-closed posture) without inheriting its dependency constraints. `cogumi-AI-shield` is likewise a reference for the actor model and deterministic policy.

---

## 1. Product framing

Wenura is a single product: a browser whose core **is** an agent (internal Domo), not an extension bolted onto one. That agent carries three responsibilities, which are one responsibility:

1. **Protect the internal agent** from untrusted web content, compromised context, and its own drift.
2. **Provide security to the user** against bad actors and bad agents.
3. **Provide automation** that makes the user's life easier.

The organizing rule: **the agent requests; deterministic policy decides; the IPC gate executes.** No LLM ever authorizes a consequential action.

### 1.1 What changes from the extension model

Domo V1 is a Chrome extension. Wenura is a Chromium/Brave-core fork with a native agent. Several extension-era mechanisms exist only to work around extension constraints and do not survive the move.

| Extension mechanism | Wenura |
|---|---|
| Content script as untrusted sensor, scoped `taskId → tabIds` | Renderer process identity is the provenance; scoping is structural |
| Stripping `[type=password]` before snapshot | Excluded natively at the autofill/renderer boundary |
| Nonce framing + TypeBox serialization (**Stage 3**) | **Dropped.** `.mojom` typed structs replace string framing |
| `chrome.storage.session` memory-only leases | Browser-process memory; wiped on profile navigation |
| Side panel approvals | Native WebUI consent surface |

**Dropped: Stage 3 (Anti-Escape Framing).** Nonce framing and TypeBox existed because `chrome.runtime` passes strings a page could forge. Mojo IPC gives typed structs across a process boundary, so the mechanism is unnecessary.

**But the invariant Stage 3 protected is retained:** *provenance must survive serialization.* In Wenura this moves to field-level provenance tags on `.mojom` structs — every field carrying `untrusted | user | system`. Dropping the mechanism without keeping the invariant yields typed data with no memory of its origin, which defeats Stage 4.

---

## 2. The 8-Stage Secure Consumer Agent Pipeline

Derived from Domo V1's 7-item baseline in `PRD.md`, renumbered as a flow and re-scoped for a browser core. Stage 3 is dropped per §1.1.

| # | Stage | Function | Wenura implementation |
|---|---|---|---|
| 1 | **Provenance & Untrusted Sensor Ingestion** | Mark all web content untrusted | Renderer/process identity + taint flag on ingested content; no cross-tab laundering |
| 2 | **Credential Exclusion by Construction** | Sensitive fields unaddressable | Native field classification; sensitive values never enter agent context; explicit hand-off on auth/payment |
| 3 | *(dropped)* | — | See §1.1 |
| 4 | **Sticky Value Provenance** | Taint survives derivation | Provenance tags on `.mojom` struct fields; derived values retain taint |
| 5 | **Action Authorization Gate** | Single execution barrier | Mojo gate, fail-closed, TOCTOU re-check immediately before dispatch |
| 6 | **Tool-Boundary Exfiltration Sinks** | Gate cross-origin writes | Enforcement at native network stack + gate; every outbound sink checked for tainted values |
| 7 | **Ephemeral Lease Storage** | Zero-persistence grants | Browser-process memory only; explicit `expiresAt`; wiped on navigation/restart |
| 8 | **HITL & Hash-Chained Audit Ledger** | Tamper-evident approval + history | Native consent surface bound to action hash; append-only ledger, metadata-only |

---

## 3. Actor model

Inherited from `cogumi-AI-shield`, adapted. In the extension, actor provenance had to be *inferred* (`navigator.webdriver`, CDP attach detection) because the extension could not know who was driving. In Wenura the agent is a first-class process, so provenance is **asserted by the architecture, not guessed.**

| Actor | Definition | Treatment |
|---|---|---|
| `human` | Browser-trusted input, no automation evidence | Only actor that bypasses the policy matrix |
| `agent` | Internal Domo over Mojo IPC | Governed by policy as itself — never mistaken for external tooling |
| `page` | Web content–initiated action | Untrusted; full policy matrix |
| `extension` | Installed extension | Trust-reviewed; treated as untrusted until trusted |
| `system` | Browser-internal | Bounded, auditable |

**Note:** Wenura does not use CDP. The agent reaches the browser over `.mojom`, so no debugger session exists and `navigator.webdriver` is never set. CDP-based inference from the shield is therefore not required; process identity + capability lease replaces it.

---

## 4. Deterministic policy layer

- **Policy is human-authored and human-ratified.** The internal agent has **no** write/edit/update access to the policy layer. It may only *consume* policy to enforce it.
- **External agents (e.g. Claude Computer) may not modify policy.** Gated by a user secret that is never stored — even encrypted storage is insufficient where ciphertext and key are both on disk. The secret is stretched into a key in memory per unlock, with no persisted verifier.
- **A compromised internal agent cannot weaken policy**, because the decision is computed in a component the agent cannot reach.
- **OS-level compromise is an explicit non-goal.** A browser cannot defend against code above it with equal privilege.

### 4.1 Policy tiers (from Domo ACTION_SECURITY_REQUIREMENTS)

| Tier | Nature | Rule |
|---|---|---|
| **T0** | Absolute invariants, deny-by-default | Never overridable; includes modifying policy bundles. Denials recorded as attempts |
| **T1** | Deterministic allowlist | Versioned, testable, explainable. Never infers authorization from model output |
| **T2** | Deterministic dynamic risk | Bounded, reproducible responses. Operates with no LLM available |
| **T3** | Telemetry-only AI Sentinel | No read tools, no raw content. May correlate and recommend; may never authorize |

---

## 5. Pre-action enforcement gates

From Domo `REQUIREMENTS.md` FR-8. The event registry carries a `deliveryMode`, one value of which is **`pre-action-gate`**: evaluated **synchronously by deterministic policy before the action completes**. Reasoning tasks must never be the sole enforcement path.

Each event definition carries: stable ID, version, provider, payload schema, sensitivity, `supportsPreActionEnforcement`, and redaction requirements.

**MVP gates:**

`download-before`, `upload-before`, `clipboard-write-before`, `form-submit-before`, `agent-action-before`, `prompt-injection-detected`, `credential-form-detected`, `sentinel-heartbeat-missed`

---

## 6. Drift management

**Status: deferred to a later security phase.** Retained here so the model is not lost, and because it constrains earlier phases.

### 6.1 The problem

Drift is a run diverging from the user's ratified intent. Two independent causes:

- **Inherited-state drift** — a respawned agent inherits the drifted context and repeats it.
- **Environmental drift** — the cause is external (hostile page, poisoned snapshot) and persists regardless of agent freshness.

A fresh agent solves the first completely and the second only partially.

### 6.2 Two scope measures — both required

Goal scope and origin scope answer different questions and are not alternatives:

| Measure | Question | Catches | Misses |
|---|---|---|---|
| **Goal scope** | Is this action still serving what the user asked? | Semantic drift | Laundering on a legitimately-scoped action |
| **Origin scope** | Did this value legitimately get here? | Laundering, injection | Benign multi-hop flows (search → product → checkout) |

Both are scored. Origin-only false-positives on ordinary browsing; goal-only misses taint riding a valid action.

### 6.3 Severity measure (deterministic)

Computed from data already tracked. No model decides the tier.

1. **Origin divergence** — hops between a value's `originOfContent` and the lease's declared scope. Score the **chain**, not the value.
2. **Tainted-crossing rate** — tainted values crossing an origin boundary, per action and per unit time.
3. **Sink proximity** — a **multiplier**, not a threshold. Tainted values heading to a Stage 6 sink promote the tier.

### 6.4 Severity tiers and response

| Tier | Condition (deterministic) | B's environment |
|---|---|---|
| **Normal** | divergence 0–1, crossings within baseline | — |
| **Soft** | divergence = 2, **or** crossings > N in one run | Same window, new agent instance, context cleared, tainted values dropped |
| **Hard** | divergence ≥ 3, **or** M consecutive actions with divergence ≥ 2, **or** **any** tainted value reaching a sink | New window, target origin only, no inherited tabs or session |
| **Block** | Hard condition repeats on the same origin | No B — block and notify |

**Sink escalation is a single-event trigger.** Any tainted value reaching an exfiltration sink goes straight to Hard regardless of divergence count. This is the one permitted single-event escalation, because it is the failure that leaks data.

### 6.5 Response model: quarantine **and** respawn

Drift triggers two things, not one:

```
drift detected (deterministic)
  → run A quarantined (frozen, evidence intact, policy-based, automatic)
  → fresh agent B in a clean environment serves the same user goal
  → user's task continues uninterrupted
  → human reviews A on their own schedule
```

Quarantine is a **review queue, not a blocking state.** Respawn is what keeps functionality intact.

**B is a new run serving the same goal — not a continuation of A.**

| B inherits | B never inherits |
|---|---|
| The user's original goal, verbatim | A's conversation history |
| Non-tainted user preferences | A's memory blocks |
| Target origin context | Any tainted value A ingested |
| | A's plan, reasoning, or conclusions |

The failure this prevents: a tainted conclusion laundered into clean-looking summary text. If B inherits A's summarized reasoning, drift propagates through the summary.

**B's scope:** same origin class (eTLD+1 or lease-declared scope), new path. B may navigate, search, or use a different entry point, but is fenced from unrelated tabs. This gives B room to route around a poisoned page without re-opening cross-tab laundering.

**Same-origin repeat:** two drifts on one origin is evidence the *origin* is the problem, not the agent. The third attempt blocks outright. Respawn loops burn compute and habituate the detector.

**A's window is preserved, frozen and inert.** Closing it destroys the forensic state quarantine exists to capture. B opens separately.

### 6.6 Forensics and containment

Quarantined runs are evidence artifacts feeding SIEM/SOAR and threat-containment workflows. Requires capture of: origin chain at quarantine, the divergence score and its inputs, the threshold that fired, the run's action history, and correlation to the respawned run.

### 6.7 Observability prerequisite

**Drift management cannot ship before an observability layer exists.** Drift detection is a *query over a stream*, not a standalone feature.

The layer must:
- emit a **structured event per action** at the Stage 5 gate (already synchronous, already pre-side-effect);
- carry **metadata only** — enum severities, origin IDs, banded counts, hashes; no raw content (per NFR-5 and ACTION_SECURITY §9);
- be **append-only and hash-chained**, extending Stage 8;
- be **queryable offline**, since threshold calibration is retrospective analysis.

**This is not new machinery.** FR-8's event envelopes already carry `actor provenance`, correlation/causation IDs, origin domain, trust classification, and redacted payloads. Stage 8's ledger is already metadata-only and hash-chained. The layer is FR-8 + Stage 8, extended with drift-relevant fields and made queryable.

---

## 7. Implementation order

Sequenced by dependency. Drift management is deliberately late.

### Phase 1 — Foundation
1. `.mojom` interfaces with **field-level provenance tags** (`untrusted | user | system`) — preserves the Stage 3 invariant without its mechanism.
2. Action authorization gate as the single fail-closed chokepoint, with TOCTOU re-check immediately before dispatch.
3. Ephemeral lease storage in browser-process memory with explicit `expiresAt`.

### Phase 2 — Policy and enforcement
4. Deterministic policy layer (T0/T1), human-authored, with **no agent write access**.
5. Pre-action gates wired to the FR-8 `pre-action-gate` delivery mode.
6. Actor model bound at the Mojo boundary by process identity + capability lease.
7. Unstored-secret gate for policy mutation (external agents).

### Phase 3 — Observability (prerequisite for drift)
8. Stage 5 gate emits a **structured metadata-only event on every action**, before any detection exists.
9. Ledger extended to store those events, hash-chained, append-only.
10. Offline query/analysis tooling.

### Phase 4 — Drift management
11. Lease gains an explicit **declared scope** (goal-shaped *and* origin-shaped).
12. Divergence scoring (chain-based) + crossing rate + sink multiplier.
13. Threshold calibration from Phase 3 data — **N and M are empirical, not guessed.**
14. Soft/Hard/Block tiers with the quarantine-and-respawn response.
15. Forensic capture and SIEM/SOAR export.
16. T3 Sentinel correlation over drift events (telemetry-only, may never authorize).

### Phase 5 — Agent as security provider
17. Extend gates to protect the user against external agents and malicious content (`prompt-injection-detected`, `malicious-content-detected`, `external-instruction-detected`).

---

## 8. Open questions

1. **N and M calibration** — requires Phase 3 data. Starting values must be instrumented, never shipped as bare constants.
2. **"Origin class" definition** — needs pinning to eTLD+1 or lease-declared scope before implementation, or it will be interpreted loosely.
3. **Goal-scope representation** — how a semantic goal is encoded such that divergence is computable deterministically.
4. **Quarantine UX** — whether the respawn is announced inline (recommended: yes, one line) or silent. Silent respawn produces an unexplained discontinuity the first time it matters.
5. ~~**V1/V2 conflict**~~ — **Resolved.** `ACTION_SECURITY_REQUIREMENTS.md` describes a *separate product* (Domo as a standalone security web agent), not a Wenura input. Wenura borrows ideas from it — T0–T3 tiers, capability leases, fail-closed posture — without inheriting its dependency constraints. Its §1 statement that V2 "MUST NOT depend on the V1 extension" is a claim about that product, not about Wenura. Nothing to reconcile.
6. **Un-quarantine authority** — human-only; recommended *not* to reuse the policy-mutation secret, since making routine review expensive pushes users to disable the detector.

---

## 9. Non-goals

- Defending against OS-level compromise.
- Guaranteeing control over actions that bypass every enforcement point.
- Allowing an LLM to make, weaken, or overrule a T0/T1 decision.
- Allowing the T3 Sentinel to authorize, execute, or read raw content.
- Replacing the enterprise IdP, EDR, CASB, DLP, SIEM, or SOAR.
