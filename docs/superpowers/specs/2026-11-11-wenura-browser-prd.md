# Product Requirements Document (PRD): Wenura AI-Native Browser

**Status:** Draft
**Product:** Wenura — an AI-native browser with an internal agent

**Provenance note:** Wenura builds on existing open-source work. This document distinguishes four categories, and the distinction matters — some are real dependencies, others are ideas only.

| Category | What it means | Items |
|---|---|---|
| **Adopted as-is** | Real code dependencies, taken unchanged | A Brave-derived privacy/hardening patchset; the network-level ad/tracker blocking engine; the browser-level agent loop |
| **Adopted as needed** | Optional per-surface | Audio/voice UI components |
| **Code borrowed** | Source we port into Wenura | The Domo agent runtime, adapted to a browser core |
| **Concepts borrowed** | Ideas only — **no code, nothing integrated** | Deterministic agent-facing policy enforcement; standalone action-security tiering |

Only the first three appear anywhere in the architecture below. Where a concept was borrowed, it is stated as Wenura's own requirement and its source is not normative.

---

## 1. Executive Summary & Vision

**Wenura** is a sovereign, high-performance, AI-native web browser in which the AI agent **is** the core operating surface rather than a sidebar extension. It is built as a downstream Chromium fork carrying upstream privacy and hardening patches, with the agent running natively behind typed IPC and heavyweight inference isolated in a sandboxed utility process.

The agent carries three responsibilities that are one responsibility:

1. **Protect itself** from untrusted web content, compromised context, and its own drift.
2. **Protect the user** against bad actors and bad agents.
3. **Automate** the user's tasks as a personal agent.

The organizing rule: **the agent requests; deterministic policy decides; the IPC gate executes.** No LLM ever authorizes a consequential action.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
* **Agent-first architecture** — the agent lives in a native WebUI surface with first-class control over view orchestration, DOM observation, and task execution.
* **Voice-first multimodal interaction** — voice as a first-class citizen alongside keyboard input, powered by Chromium built-in STT/TTS plus hotswap-configurable local **Kokoro** (TTS) and **Whisper Tiny** (STT) models running in sandboxed utility workers, managed directly via `chrome://settings`.
* **Speed and privacy by default** — network-level ad/tracker blocking and telemetry stripping inherited from the upstream fork.
* **Zero-trust security model** — untrusted content and its parsing isolated from the agent's control loop by process boundaries and typed IPC.
* **Deterministic authorization** — every consequential action gated by code-computed policy, never by model judgment.
* **Local compute offloading** — entity extraction and small-model inference inside a restricted utility process.

### Non-Goals
* Re-implementing browser primitives (rendering engine, JS engine, TLS stack) from scratch.
* Defending against OS-level compromise — a browser cannot defend against code above it with equal privilege.
* Replacing enterprise IdP, EDR, CASB, DLP, SIEM, or SOAR.
* Supporting legacy NPAPI plugins or non-standard web protocols.

### Anti-Goals
* Building Wenura as an Electron or extension wrapper — high memory overhead, weak isolation.
* Letting any model make, weaken, or overrule an authorization decision.
* Treating borrowed prior art as architecture rather than as reference.

---

## 3. Architecture & Version Pinning

### 3.1 Pinned Versions & Upstream Baseline
* **Chromium Milestone:** 131 (`131.0.6778.x` / branch 6778)
* **Downstream patch layer:** a Brave-derived patchset aligned to Chromium 131
* **Build toolchain:** `depot_tools` (`gclient`, GN, Ninja)

### 3.2 Repository Structure & Downstream Overlay
```text
wenura/
├── .gclient                # depot_tools multi-repo config
├── src/
│   ├── chromium/           # upstream Chromium source (read-only base)
│   ├── downstream/         # Brave-derived privacy/hardening patchset
│   └── wenura/             # Wenura's own code — agent, IPC, WebUI, utility workers
```

### 3.3 Upstream Sync Pipeline
1. **Pin** — lock `.gclient` and `DEPS` to the Chromium milestone and matching downstream patchset tag.
2. **Isolate** — all Wenura code lives in `src/wenura/`, hooking into build targets via GN flags; upstream and downstream trees are never edited directly.
3. **Update** — `gclient sync` pulls upstream security patches and milestone bumps cleanly, with no downstream merge conflicts.

### 3.4 Layered Architecture

| Layer | Component | Responsibility |
|---|---|---|
| **1** | **Upstream base** | Chromium engine and Blink renderer; **`brave-core`** adopted as-is; GN/Ninja toolchain |
| **2** | **Network & core protection** | **`adblock-rust`** plus the upstream network-filter hooks, adopted as-is; telemetry stripping; fingerprinting defenses |
| **3** | **Sandboxed IPC** | Typed IDL interfaces compiled to secure cross-process bindings; strict serialization between agent and browser core |
| **4** | **Agent shell & WebUI** | Privileged system-page host for the agent surface; React + Vite frontend; **`pi-agent-core`** as the browser-level agent loop, ported from Domo; audio/voice components adopted as needed |
| **5** | **Utility worker compute** | OS-sandboxed utility process hosting local small-model inference and entity extraction |

---

## 4. Security Architecture

### 4.1 Foundation

* **Multi-process sandboxing.** Every tab, renderer, utility worker, and service runs in an isolated OS-level sandbox (macOS Seatbelt, Windows AppContainer, Linux `seccomp-bpf`). Renderer compromise cannot escape to the host.
* **Typed IPC boundary.** All agent↔browser communication crosses a typed IDL boundary. Untrusted web content cannot forge, spoof, or inject agent commands.
* **Provenance survives serialization.** Every field crossing the IPC boundary carries a provenance tag — `untrusted | user | system`. This invariant is foundational: typed data without a memory of its origin defeats every downstream control.

### 4.2 The 8-Stage Secure Agent Pipeline

| # | Stage | Function |
|---|---|---|
| 1 | **Provenance & untrusted ingestion** | All web content marked untrusted at ingestion; renderer/process identity is the provenance; no cross-tab laundering |
| 2 | **Credential exclusion by construction** | Sensitive fields excluded before they reach agent context; auth and payment steps hand control back to the user |
| 3 | **Sticky value provenance** | Derived values retain the taint of their sources; taint propagates through every transformation |
| 4 | **Action authorization gate** | Single fail-closed execution barrier; re-verifies state immediately before dispatch (time-of-check / time-of-use) |
| 5 | **Tool-boundary exfiltration sinks** | Every outbound sink (navigation, form submission, remote model call) checked for tainted values before it fires |
| 6 | **Ephemeral lease storage** | Privilege grants held in process memory only, with explicit expiry; wiped on navigation, restart, or restore |
| 7 | **Human-in-the-loop & audit ledger** | Consent bound to an action hash; append-only, tamper-evident ledger recording metadata only |

**Note on framing.** The extension-era pipeline carried an additional anti-escape stage (nonce framing plus strict schema serialization) because its messages crossed an untrusted *string* channel. Wenura has no such channel — typed IPC replaces it, so that stage is absent rather than deferred. The invariant it protected is retained in §4.1: provenance survives serialization.

### 4.3 Actor Model

Every action resolves to an actor, and the actor determines what policy applies.

| Actor | Definition | Treatment |
|---|---|---|
| `human` | Browser-trusted input with no automation evidence | The only actor that bypasses the policy matrix |
| `agent` | Wenura's internal agent, over typed IPC | Governed by policy as itself — never mistaken for external tooling |
| `page` | Action initiated by web content | Untrusted; full policy matrix |
| `extension` | Installed extension | Treated as untrusted until explicitly trusted by the user |
| `system` | Browser-internal | Bounded and auditable |

**Provenance is asserted, not inferred.** Because the agent is a first-class process with a known identity, Wenura states the actor rather than guessing it from heuristics. This is a structural advantage over an extension, which cannot know who is driving it.

### 4.4 Deterministic Policy Layer

* **Policy is human-authored and human-ratified.** The internal agent has **no** write, edit, or update access to policy. It may only consume policy to enforce it.
* **External agents may not modify policy.** Gated by a user secret that is never stored. Encrypted storage is insufficient where ciphertext and key both reside on disk; the secret is stretched into a key in memory per unlock with no persisted verifier.
* **A compromised internal agent cannot weaken policy**, because the decision is computed in a component the agent cannot reach.
* **Fail closed.** When policy or revocation state is unavailable, protected operations are denied.

**Policy tiers:**

| Tier | Nature | Rule |
|---|---|---|
| **T0** | Absolute invariants, deny-by-default | Never overridable, including by the agent. Denials are recorded as attempts even though execution never occurs |
| **T1** | Deterministic allowlist | Versioned, testable, explainable. Never infers authorization from model output |
| **T2** | Deterministic dynamic risk | Bounded, reproducible responses. Operates with no model available |
| **T3** | Telemetry-only AI Sentinel | No read tools, no raw content. Correlates and recommends; may never authorize |

### 4.5 Pre-Action Enforcement Gates

Consequential actions are intercepted **before** their side effect, evaluated synchronously by deterministic policy. A reasoning task is never the sole enforcement path.

**MVP gates:** download, upload, clipboard write, form submission, agent action, prompt injection detected, credential form detected, sentinel heartbeat missed.

Each gate definition carries a stable ID, version, provider, payload schema, sensitivity, whether it supports pre-action enforcement, and its redaction requirements.

### 4.6 Drift Management

**Phased later — see §5.** The model is recorded here because it constrains earlier phases.

**Two scope measures, both required.** They answer different questions and are not alternatives:

| Measure | Question | Catches | Misses alone |
|---|---|---|---|
| **Goal scope** | Is this action still serving what the user asked? | Semantic drift | Laundering on a legitimately-scoped action |
| **Origin scope** | Did this value legitimately get here? | Laundering, injection | Benign multi-hop flows |

**Severity is computed, never judged.** Three signals: origin divergence (chain-based, not value-based), tainted-crossing rate, and sink proximity as a **multiplier** rather than a threshold.

| Tier | Condition (deterministic) | Response |
|---|---|---|
| **Normal** | divergence within baseline | — |
| **Soft** | divergence elevated, or crossings exceed N in one run | Same window; new agent instance; context cleared; tainted values dropped |
| **Hard** | divergence high, or M consecutive divergent actions, or **any** tainted value reaching a sink | New window; target origin only; no inherited tabs or session |
| **Block** | Hard condition repeats on the same origin | No respawn — block and notify |

Sink escalation is the one permitted single-event trigger, because it is the failure that leaks data.

**Response: quarantine *and* respawn.**

```
drift detected (deterministic)
  → run A quarantined (frozen, evidence intact, automatic, policy-based)
  → fresh agent B serves the same user goal in a clean environment
  → the user's task continues uninterrupted
  → a human reviews A on their own schedule
```

Quarantine is a **review queue, not a blocking state.** Respawn is what keeps functionality intact.

**B is a new run serving the same goal — not a continuation of A.**

| B inherits | B never inherits |
|---|---|
| The user's original goal, verbatim | A's conversation history |
| Non-tainted user preferences | A's memory blocks |
| Target origin context | Any tainted value A ingested |
| | A's plan, reasoning, or conclusions |

This prevents the subtlest failure: a tainted conclusion laundered into clean-looking summary text.

**B's scope:** same origin class; new path permitted. B may navigate, search, or take a different entry point, but is fenced from unrelated tabs. This lets B route around a hostile page without re-opening cross-tab laundering.

**A's window is preserved, frozen and inert.** Closing it destroys the forensic state quarantine exists to capture.

**Forensics and containment.** Quarantined runs are evidence artifacts for external SIEM/SOAR and threat-containment workflows: origin chain at quarantine, the severity score and its inputs, the threshold that fired, the run's action history, and correlation to the respawned run.

### 4.7 Observability Prerequisite

**Drift management cannot ship before an observability layer exists.** Drift detection is a *query over a stream*, not a standalone feature.

The layer must:
* emit a **structured event per action** at the authorization gate — already synchronous, already pre-side-effect;
* carry **metadata only** — enum severities, origin identifiers, banded counts, hashes; never raw content;
* be **append-only and hash-chained**, extending the Stage 8 ledger;
* be **queryable offline**, because threshold calibration is retrospective analysis.

This is an extension of the audit ledger in §4.2 Stage 8, not new machinery.

---

## 5. Implementation Order

Sequenced by dependency. Drift management is deliberately late; two of its prerequisites are foundation and come early.

### Phase 1 — Foundation
1. Typed IPC interfaces with **field-level provenance tags** (`untrusted | user | system`).
2. Action authorization gate as the single fail-closed chokepoint, with time-of-check / time-of-use re-verification before dispatch.
3. Ephemeral lease storage in process memory with explicit expiry.

### Phase 2 — Policy & Enforcement
4. Deterministic policy layer (T0/T1), human-authored, with **no agent write access**.
5. Pre-action gates wired to the synchronous enforcement path.
6. Actor model bound at the IPC boundary by process identity and capability lease.
7. Unstored-secret gate for policy mutation by external agents.

### Phase 3 — Observability *(prerequisite for drift)*
8. Authorization gate emits a **structured metadata-only event on every action**, before any detection exists.
9. Ledger extended to store those events, hash-chained and append-only.
10. Offline query and analysis tooling.

### Phase 4 — Drift Management
11. Leases gain an explicit **declared scope** (goal-shaped *and* origin-shaped).
12. Divergence scoring (chain-based), crossing rate, and sink multiplier.
13. Threshold calibration from Phase 3 data — **N and M are empirical, never guessed.**
14. Soft / Hard / Block tiers with the quarantine-and-respawn response.
15. Forensic capture and SIEM/SOAR export.
16. T3 Sentinel correlation over drift events (telemetry-only; may never authorize).

### Phase 5 — Agent as Security Provider & Voice Multimodal Architecture
17. Extend gates to protect the user against external agents and malicious content.
18. **Voice-First Multimodal Subsystem:** Implement Chromium built-in Speech Recognition/Synthesis alongside local **Kokoro** (TTS) and **Whisper Tiny** (STT) models running in sandboxed utility workers, with full hotswap configuration exposed in `chrome://settings`.

---

## 6. Security Epics

* **Epic 1: IPC Contracts & Sandboxed Utility Compute**
  * *1.1* Define typed IPC interfaces with field-level provenance tags for cross-process communication.
  * *1.2* Implement the sandboxed utility process hosting local inference and entity extraction.
  * *1.3* Unit tests verifying that injection payloads in DOM text are neutralized and tagged untrusted.

* **Epic 2: Action Authorization Gate & Policy Tiers**
  * *2.1* Implement capability lease issuance, validation, and revocation-epoch checks.
  * *2.2* Implement T0 (absolute invariants) and T1 (deterministic allowlist) evaluation.
  * *2.3* Implement T2 dynamic risk for sequence anomaly and blast-radius detection.
  * *2.4* Implement the single fail-closed gate with time-of-check / time-of-use re-verification.

* **Epic 3: Human-in-the-Loop Consent**
  * *3.1* Implement the privileged-action gatekeeper at the IPC boundary.
  * *3.2* Build the native consent surface with a visual diff preview for high-impact actions.

* **Epic 4: Audit Ledger & T3 Sentinel**
  * *4.1* Implement the append-only, tamper-evident ledger recording signed requests, decisions, and receipts.
  * *4.2* Implement the T3 Sentinel over metadata-only telemetry, with no read tools or raw content access.

---

## 7. Open Questions

1. **Goal-scope representation** — how a semantic goal is encoded such that divergence is *deterministically* computable. This decides whether Phase 4 is feasible as specified.
2. **"Origin class" definition** — must be pinned before implementation, or it will be interpreted loosely.
3. **N and M calibration** — requires Phase 3 data; starting values must be instrumented, never shipped as bare constants.
4. **Quarantine UX** — whether respawn is announced inline (recommended) or silent. Silent respawn produces an unexplained discontinuity the first time it matters.
5. **Un-quarantine authority** — human-only; recommended *not* to reuse the policy-mutation secret, since making routine review expensive pushes users to disable the detector.
