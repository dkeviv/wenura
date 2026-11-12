# Product Requirements Document (PRD): Wenura AI-Native Browser

## 1. Executive Summary & Vision
**Wenura** is a sovereign, high-performance, AI-native web browser where the AI agent is the core operating surface rather than a bolted-on sidebar extension. By forking upstream Chromium and integrating Brave-core privacy/speed protections alongside native Mojo IPC and sandboxed utility process inference, Wenura delivers lightning-fast browsing combined with robust agentic workflows, local ONNX/GLiNER intelligence, and state-of-the-art security against prompt injection and browser exploits.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
* **Agent-First Architecture:** The AI agent lives in a native WebUI process (`chrome://workspace`), giving it first-class control over multi-tab view orchestration, DOM observation, and task execution.
* **Speed & Privacy by Default:** Inherit Brave-core's network-level ad/tracker blocking (`adblock-rust`) and telemetry stripping for instantaneous page loads and uncompromising privacy.
* **Zero-Trust Security Model:** Isolate untrusted web content and DOM parsing from local LLM inference and agent control loops using Chromium multi-process sandboxing and `.mojom` typed IPC.
* **Local Compute Offloading:** Run entity extraction (GLiNER) and local embeddings/small LLMs inside a restricted OS-level `UtilityProcess` using ONNX Runtime.

### Non-Goals
* Re-implementing standard browser primitives (rendering engine, JavaScript V8 engine, TLS stack) from scratch.
* Supporting legacy NPAPI plugins or non-standard web protocols.

### Anti-Goals
* Building Wenura purely as an Electron or Chrome extension wrapper that suffers from high memory overhead and weak process isolation.

---

## 3. The 5-Layer Browser Architecture & Version Pinning

### 3.1 Pinned Versions & Upstream Baseline
* **Chromium Milestone:** Milestone 131 (`131.0.6778.x` / branch 6778)
* **`brave-core` Release Tag:** `v1.73.x` (aligned with Chromium 131)
* **Build Toolchain:** Google `depot_tools` (`gclient`, GN, Ninja)

### 3.2 Repository Structure & Downstream Overlay
```text
wenura-browser/
├── .gclient                # Google depot_tools multi-repo config
├── src/
│   ├── chromium/           # Upstream Chromium source (read-only base)
│   ├── brave/              # Official brave-core (pulled as downstream submodule/patchset)
│   └── wenura/             # CUSTOM AGENT LAYER (React WebUI, mojom, utility workers)
```

### 3.3 Upstream Sync Pipeline
1. **Pinning:** Lock `.gclient` and `DEPS` to Chromium Milestone 131 and `brave-core` tag `v1.73.x`.
2. **Isolation:** All custom Wenura agent code resides in `src/wenura/` and hooks into Chromium build targets via standard GN flags (`args.gn`), completely avoiding direct edits to core `src/brave/` files.
3. **Merging Updates:** When upstream security patches or new Chromium milestones drop, execute `gclient sync` to update the base runtimes cleanly without downstream merge conflicts.

---

## 4. The 5-Layer Browser Architecture

| Layer | Component & Architecture | Exact Open-Source Elements Borrowed / Integrated |
| :--- | :--- | :--- |
| **Layer 1** | **Upstream Base** <br>*(Core Browser Runtime)* | • **Chromium `src/`** (Upstream browser engine & Blink renderer)<br>• **`brave-core`** patchset (Brave's upstream integration layer)<br>• **`depot_tools`** & Google GN/Ninja build toolchain |
| **Layer 2** | **Network & Core Protection** <br>*(Speed & Security)* | • **`adblock-rust`** (High-performance Rust ad/tracker blocking engine)<br>• **Brave Shields C++ hooks** (`content::ResourceThrottle` & network delegate filters)<br>• **Brave Telemetry Stripping patches** (removing Google telemetry & safe browsing pingbacks) |
| **Layer 3** | **Sandboxed IPC** <br>*(Type-Safe Communication)* | • **Chromium Mojo IDL (.mojom)** compiler & system bindings<br>• **`mojo::AssociatedReceiver`** / `mojo::Remote` for secure cross-process serialization |
| **Layer 4** | **Agent Shell & WebUI** <br>*(The AI Command Surface)* | • **Chromium `content::WebUIController`** (hosting local web UI as privileged system pages)<br>• **React + Vite** frontend build pipeline (`shadcn/ui`, Vercel AI SDK primitives)<br>• **ElevenLabs UI components** (`ui.elevenlabs.io`) for voice/audio/agent visualizers<br>• **`pi-agent-core`** (adapted from Domo for browser-level agent loops) |
| **Layer 5** | **Utility Worker Compute** <br>*(Local LLMs & Entity Extraction)* | • **Chromium `content::UtilityProcessHost`** (sandboxed OS-level utility process)<br>• **ONNX Runtime** (C++ bindings for local model inference)<br>• **GLiNER / local embedding weights** for DOM entity extraction |

---

## 4. Security Architecture & Threat Model

### 4.1 Multi-Process Sandboxing
* Every tab, extension, utility worker, and renderer runs in an isolated OS-level sandbox (macOS Seatbelt, Windows AppContainer, Linux `seccomp-bpf`).
* Memory corruption or remote code execution (RCE) in a web renderer cannot escape to the host system.

### 4.2 Indirect Prompt Injection Mitigation (Layer 5 GLiNER Isolation)
* When the agent reads arbitrary web pages, DOM parsing and entity extraction run inside the restricted **Utility Process** using **GLiNER** via ONNX Runtime.
* Malicious text on a webpage designed to hijack the AI prompt stream is extracted, classified, and tagged strictly as *Untrusted Data*, neutralizing prompt injection while preserving clean semantic entities for the agent.

### 4.3 Domo Action Security Integration (T0–T3 Tiers & Leases)
* **Capability Leases:** Short-lived cryptographic tokens binding `subject + session + target asset + operation`.
* **T0 (Absolute Invariants) & T1 (Allowlist):** Deterministic deny-by-default policy evaluation (never relying on LLM output for authorization).
* **T2 Dynamic Risk & T3 Metadata Sentinel:** Continuous behavioral monitoring using metadata-only telemetry (enums and stable IDs only—zero raw content access).

### 4.4 Privileged Action Gatekeeper & Consent Modal
* While the React agent UI plans and reasons freely, any high-impact action (form submission, financial transaction, credential auto-fill, file system write) requires explicit cryptographic capability lease verification and an inline user intent confirmation modal with a visual diff preview.

---

## 5. Security Epics and User Stories

* **Epic 1: IPC Contracts & Sandboxed Utility Compute (GLiNER & ONNX)**
  * *Story 1.1:* Define type-safe `ai_agent.mojom` IPC interfaces for cross-process communication.
  * *Story 1.2:* Implement `UtilityProcessHost` and C++ utility worker hosting ONNX Runtime and GLiNER entity extraction.
  * *Story 1.3:* Write unit tests verifying that prompt injection payloads in DOM text are neutralized and tagged as untrusted data.

* **Epic 2: Domo Action Security Gateway & Policy Tiers (T0–T2)**
  * *Story 2.1:* Implement capability lease issuance, validation, and revocation epoch checks.
  * *Story 2.2:* Implement T0 (absolute invariants) and T1 (deterministic allowlist) policy evaluation engines.
  * *Story 2.3:* Implement T2 dynamic risk engine for sequence anomaly and blast radius detection.

* **Epic 3: Human-in-the-Loop Consent & User Intent Gatekeeper**
  * *Story 3.1:* Implement Privileged Action Gatekeeper intercepting requests at the Mojo IPC boundary.
  * *Story 3.2:* Build the React intent confirmation modal providing visual diff previews for high-impact actions.

* **Epic 4: T3 Telemetry-Only AI Sentinel & Audit Ledger**
  * *Story 4.1:* Implement T3 AI Sentinel receiving metadata-only telemetry streams with no read tools or raw content access.
  * *Story 4.2:* Implement append-only tamper-evident audit ledger recording signed action requests, policy decisions, and execution receipts.
