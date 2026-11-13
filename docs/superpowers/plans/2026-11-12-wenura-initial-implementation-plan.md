# Wenura AI-Native Browser Initial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the foundational architecture, secure Mojo IPC contracts, sandboxed utility inference for ONNX/GLiNER, proactive agent loops, and hotswap voice multimodal subsystems (Kokoro, Whisper Tiny) for Wenura.

**Architecture:** Downstream Chromium fork (Milestone 131 / brave-core v1.73.x base) integrating custom C++/Mojo IPC bindings (`ai_agent.mojom`), a React + Vite WebUI agent shell (`chrome://workspace`), and a sandboxed `UtilityProcess` for local ONNX/GLiNER and voice model inference.

**Tech Stack:** C++, Mojo (.mojom), Chromium content layer, React, TypeScript, Vite, ONNX Runtime Web / Transformers.js, Rust (`adblock-rust`).

**Spec:** `docs/superpowers/specs/2026-11-11-wenura-browser-prd.md`

## Global Constraints
- Target Chromium Milestone: 131 (`131.0.6778.x`) with `brave-core` v1.73.x tag.
- Downstream custom code must reside strictly in `src/wenura/` without modifying core `src/brave/` files directly.
- Zero-trust security: untrusted web content parsing and GLiNER entity extraction run strictly inside the sandboxed `UtilityProcess`.
- Voice models (Kokoro, Whisper Tiny) and local inference (Qwen 0.6B) execute locally via ONNX/WebGPU with hotswap configuration via `chrome://settings`.

## Review Focus
1. **IPC Boundary Safety:** Ensuring untrusted renderer requests cannot bypass Mojo type checks or invoke privileged browser actions without policy verification.
2. **Utility Process Isolation:** Verifying that ONNX Runtime and GLiNER processing inside `UtilityProcessHost` cannot access disk or network directly.
3. **Voice Engine Hotswap:** Confirming runtime switching between Chromium native STT/TTS and local Kokoro/Whisper Tiny models without crashing the audio context.
4. **Deterministic Policy Enforcement:** Proving that authorization decisions are computed strictly in code via T0/T1 rules rather than trusting model reasoning outputs.
5. **Memory & Provenance Taint:** Validating that untrusted page content is marked `isTainted = true` and that provenance tags survive serialization.

---

### Task 1: Repository Scaffolding & Build Configuration

**Files:**
- Create: `.gclient`
- Create: `src/wenura/BUILD.gn`
- Create: `src/wenura/args.gn`
- Test: `src/wenura/tests/build_test.py`

**Interfaces:**
- Consumes: Chromium build toolchain (`depot_tools`)
- Produces: GN build targets for Wenura downstream overlay (`//src/wenura:wenura_core`)

- [ ] **Step 1: Write build configuration test in `src/wenura/tests/build_test.py`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement GN build files in `src/wenura/BUILD.gn`**
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**

### Task 2: Mojo IPC Interface & Provenance Tags (`ai_agent.mojom`)

**Files:**
- Create: `src/wenura/mojom/ai_agent.mojom`
- Create: `src/wenura/mojom/ai_agent_mojom_traits.h`
- Test: `src/wenura/mojom/ai_agent_unittest.cc`

**Interfaces:**
- Consumes: Chromium Mojo IDL compiler
- Produces: `ai_agent.mojom` typed IPC structs with `ProvenanceTag` (`kUntrusted`, `kUser`, `kSystem`)

- [ ] **Step 1: Write Mojo interface and unit test in `src/wenura/mojom/ai_agent_unittest.cc`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `ai_agent.mojom` and trait bindings**
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**

### Task 3: Sandboxed Utility Process for ONNX & GLiNER Inference

**Files:**
- Create: `src/wenura/utility/ai_utility_host.cc`
- Create: `src/wenura/utility/ai_utility_impl.cc`
- Test: `src/wenura/utility/ai_utility_unittest.cc`

**Interfaces:**
- Consumes: `ai_agent.mojom` IPC client
- Produces: `content::UtilityProcessHost` wrapper running ONNX Runtime / GLiNER entity extraction in an OS-level sandbox

- [ ] **Step 1: Write utility process unit test in `src/wenura/utility/ai_utility_unittest.cc`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `AIUtilityHost` and `AIUtilityImpl`**
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**

### Task 4: Voice-First Hotswap Multimodal Subsystem (Kokoro & Whisper Tiny)

**Files:**
- Create: `src/wenura/voice/voice_manager.ts`
- Create: `src/wenura/voice/engines/kokoro_tts.ts`
- Create: `src/wenura/voice/engines/whisper_stt.ts`
- Test: `src/wenura/voice/voice_manager.test.ts`

**Interfaces:**
- Consumes: Utility process inference bridge, Web Speech API (`webkitSpeechRecognition`, `speechSynthesis`)
- Produces: `VoiceManager` supporting hotswap selection between Chrome native, Kokoro TTS, and Whisper Tiny STT configured via settings.

- [ ] **Step 1: Write failing test in `src/wenura/voice/voice_manager.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `VoiceManager`, `KokoroTTS`, and `WhisperSTT`**
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**

### Task 5: Agent Core Loop & Proactive WebUI (`chrome://workspace`)

**Files:**
- Create: `src/wenura/agent/core_loop.ts`
- Create: `src/wenura/panel/WorkspaceApp.tsx`
- Test: `src/wenura/agent/core_loop.test.ts`

**Interfaces:**
- Consumes: `pi-agent-core` (adapted from Domo), Mojo IPC bridge, `VoiceManager`
- Produces: `chrome://workspace` React WebUI surface hosting the proactive agent loop, memory blocks, and dual-citizen voice/text composer.

- [ ] **Step 1: Write failing test in `src/wenura/agent/core_loop.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement agent core loop and React workspace UI**
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**
