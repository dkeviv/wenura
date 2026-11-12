# Wenura AI-Native Browser - AI Agent Instructions (AGENTS.md)

## Core Mission
You are assisting in building **Wenura**, an AI-native web browser where the AI agent is the core operating surface (`chrome://workspace`), built on upstream Chromium Milestone 131 and `brave-core` v1.73.x.

## Key Rules for Agents (Adhering to Cogumi Rules)
1. **Downstream Isolation:** All custom agent logic, Mojo IPC contracts (`.mojom`), and React UI components must reside in `src/wenura/`. Never modify core files in `src/brave/` or upstream Chromium directly.
2. **Simple & Surgical Changes:** Keep code minimal, surface assumptions early, design for change, and test real user flows.
3. **Security & Zero-Trust Architecture:**
   - DOM ingestion and entity extraction (GLiNER / ONNX) must execute inside sandboxed `UtilityProcess` instances (Layer 5).
   - Privileged actions require capability leases and explicit user intent confirmation.
4. **Prove Before Done:** Search before writing, test thoroughly, and prove the work before claiming completion.
5. **Reference Docs:** Always consult `docs/superpowers/specs/2026-11-11-wenura-browser-prd.md` for complete product and architectural requirements.
