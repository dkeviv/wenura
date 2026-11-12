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

## 3. The 5-Layer Browser Architecture

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

### 4.2 Indirect Prompt Injection Mitigation (Layer 5 Isolation)
* When the agent reads arbitrary web pages, DOM parsing and entity extraction run inside the restricted **Utility Process**.
* Malicious text on a webpage designed to hijack the AI prompt stream is contained within the unprivileged utility sandbox and cannot execute system-level commands or access user credentials.

### 4.3 Privileged Action Gatekeeper
* While the React agent UI plans and reasons freely, any high-impact action (form submission, financial transaction, credential auto-fill, file system write) requires explicit cryptographic or user-intent policy confirmation.

---

## 5. Implementation Epics

* **Epic 1:** Monorepo Setup & Build Environment (`depot_tools` + Chromium checkout + `brave-core` patch overlay).
* **Epic 2:** Network-Level Ad/Tracker Blocking (`adblock-rust`) & Telemetry Stripping Integration.
* **Epic 3:** Custom `ai_agent.mojom` Interface & Type-Safe IPC Pipeline.
* **Epic 4:** Native `chrome://workspace` WebUI Agent Shell (React + Vite + ElevenLabs audio/agent components).
* **Epic 5:** Sandboxed `UtilityProcess` Integration for Local ONNX Inference & GLiNER.
