# Wenura AI-Native Browser - Developer Instructions (CLAUDE.md)

## Project Overview
Wenura is an AI-native browser where the AI agent is the core operating surface, built on top of upstream Chromium Milestone 131 and `brave-core` v1.73.x (`src/brave/`). Custom agent code, IPC contracts, and WebUI components live exclusively in `src/wenura/` as a downstream overlay.

---

## Architecture & Directory Structure
- `src/chromium/` — Upstream Chromium source base (read-only base).
- `src/brave/` — Official `brave-core` (Brave Shields, `adblock-rust`, telemetry stripping).
- `src/wenura/` — **Custom Agent Layer**
  - `src/wenura/agent/` — Agent core loop (`pi-agent-core` adaptation).
  - `src/wenura/mojom/` — Custom `.mojom` type-safe IPC interfaces (`ai_agent.mojom`).
  - `src/wenura/utility/` — Sandboxed UtilityProcess hosting ONNX Runtime & GLiNER entity extraction.
- `docs/superpowers/specs/` — Product Requirements Documents (PRDs) and architectural specs.

---

## Engineering Guidelines (Adhering to Cogumi Rules)
1. **Never edit `src/brave/` or upstream Chromium files directly.** Isolate all custom code in `src/wenura/` and hook into GN build targets via clean build flags.
2. **Simple & Surgical Changes:** Keep code minimal, surface assumptions early, design for change, and test real user flows.
3. **Security First (Zero-Trust):**
   - Untrusted web content DOM parsing and GLiNER entity extraction must run strictly inside the sandboxed `UtilityProcess` (Layer 5).
   - High-impact actions (form submissions, financial transactions, file writes) must pass through capability leases and user intent confirmation gates.
4. **Upstream Sync:** Use `gclient sync` to update upstream Chromium and brave-core dependencies according to the pinned versions in `.gclient` and `DEPS`.
5. **Prove Before Done:** Search before writing, test thoroughly, and verify work before claiming completion.
