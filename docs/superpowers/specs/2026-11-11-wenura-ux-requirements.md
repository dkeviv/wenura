# Wenura UX Requirements & Design System Specification (v1.4.0)

## 1. Executive Summary & Core Design Philosophy
**Wenura** is an AI-native browser where the AI agent is the core operating surface (`chrome://workspace`) with voice as the primary input/output medium, anchored by a living 2D Sun Orb. 

Our user experience is governed by four foundational design pillars:
1. **Reduce User Effort (Zero-Friction Delegation):** Shifting the user from manual operator to director. Complex multi-tab workflows, research tasks, and form completions happen through single spoken or typed instructions.
2. **Delightful, Elevating Colors & Design (The Guiding Light):** Rejecting clinical software aesthetics in favor of a tactile, premium environment anchored by a vibrant yellow accent (`#FFD60A`) cutting through dark night surfaces (`#0B0C11`), clean light modes (`#F7F7F9`), and warm ivory paper grounds (`#FAF9F5`).
3. **Radical Intuitiveness (Don't Make Me Think):** Ensuring immediate comprehension through transparent agent step telemetry, dual-citizen voice/text input, and familiar browser mental models.
4. **Humanly Expressive Interaction (The Living Sun Orb):** Treating interaction as conversational and empathetic. The 2D Sun Orb conveys agent state (listening, thinking, speaking, dictating) entirely through organic ray geometry and motion rather than color shifts.

---

## 2. Formal UX Requirements Matrix

| Requirement ID | Pillar & Category | Functional UX Requirement Specification |
| :--- | :--- | :--- |
| **UXR-1.1** | Reduce User Effort | **Single-Utterance Multi-Tab Execution:** Users must be able to initiate and complete tasks spanning 3+ tabs with a single spoken or typed command. |
| **UXR-1.2** | Reduce User Effort | **Automatic Context Clustering:** The browser must automatically group open tabs into semantic Topics (`S-05`) in the sidebar using local GLiNER entity extraction. |
| **UXR-1.3** | Reduce User Effort | **Proactive Silence:** Background events (emails, tracked site updates) must arrive exclusively as quiet, collapsed, text-only alert cards (`S-06`) on the workspace. |
| **UXR-1.4** | Reduce User Effort | **Human-in-the-Loop Intent Gates:** Irreversible actions (payments, sends, deletions) must halt execution and present an Approval Card (`S-10`) with 1-second hold-to-approve. |
| **UXR-2.1** | Elevating Design | **Immersive Multi-Theme Support:** Seamless rendering across Night (dark default `#0B0C11`), Light (`#F7F7F9`), and Warm (ivory paper ground `#FAF9F5`) modes. |
| **UXR-2.2** | Elevating Design | **Tactile Hierarchy & Typography:** Sora for bold display titles, Geist for body text, and Geist Mono for code, timestamps, and tab badge counters. |
| **UXR-2.3** | Elevating Design | **Surface Light-Spill & Elevation:** Interactive panels and overlays must use layered shadows and subtle orb light-spill (`elevation.1-3`) for physical depth. |
| **UXR-3.1** | Intuitiveness | **Transparent Agent Telemetry:** Agent action rows (`S-11`) displaying exact status (Done, Running, Waiting, Failed) and Engine Chips (*On-device* vs. *Claude Desktop*). |
| **UXR-3.2** | Intuitiveness | **Dual-Citizen Input:** Instantaneous toggle between voice dictation and keyboard text input in the Composer component without losing context. |
| **UXR-3.3** | Intuitiveness | **Familiar Window & Tab Mental Models:** Retaining window controls, settings hierarchies, and vertical tab management for zero learning curve. |
| **UXR-4.1** | Expressive Interaction | **Emotional State Expression via Geometry:** The 2D Sun Orb must communicate agent state entirely through ray motion and geometry—never hue (*idle*, *listening*, *think*, *speak*, *dictate*). |
| **UXR-4.2** | Expressive Interaction | **Tactile Physics & Cursor Interaction:** Hovering or touching the Sun Orb causes rays to bend away and spring back organically. |
| **UXR-4.3** | Expressive Interaction | **Persistent Microphone Awareness:** A persistent recording indicator (`color.indicator.recording`) and caption bar (`S-17`) must remain visible during active audio capture. |

---

## 4. Spatial Layout & Relationship to Arc

While Wenura adopts and respects the spatial ergonomics pioneered by browsers like Arc (such as vertical sidebars, minimal borderless chrome, and focused content breathing room), Wenura fundamentally shifts the paradigm from **manual user organization** to **autonomous, voice-driven AI management**.

### 4.1 What Wenura Adapts from the Spatial Model
* **Vertical Sidebar Layout:** Tabs and active task streams are organized vertically on the left side, eliminating top-heavy horizontal tab clutter.
* **Minimalist Borderless Window:** Removing traditional browser clutter, hiding the standard horizontal tab strip, and letting website content breathe with rounded window corners and custom multi-mode themes (Night `#0B0C11`, Light `#F7F7F9`, and Warm `#FAF9F5`).

### 4.2 Where Wenura Goes Beyond (The AI-Native / Voice Twist)
* **AI-Managed Topics (`S-05`) vs. Manual Folders:** Instead of requiring users to manually drag and create spaces or folders, Wenura's local ONNX/GLiNER engine automatically clusters open tabs into dynamic semantic task streams based on active user intent.
* **Agent Context Pins vs. Static Pinning:** Rather than static pinned tabs, tabs actively operated on by the agent are pinned dynamically as "Context Chips" for the current task, and automatically archive or collapse into a summary card upon task completion.
* **Voice-Driven Tab Navigation via the Sun Orb:** Navigation and sidebar management are fully voice-enabled (*"Switch to my Tokyo trip tabs"*, *"Close everything except flight booking"*), accompanied by live agent action telemetry (`S-11`).
* **The Persistent Sun Orb Anchor:** Stationed in the vertical sidebar or workspace centerpiece, the living 2D Sun Orb remains always accessible for voice input, reacting and glowing in real-time as the user manages their browsing session.

### 3.1 Color Roles & Themes
* **Accent:** Vibrant pure yellow (`primitive.color.accent.500` = `#FFD60A`), with near-black text on accent (`#0B0C11`).
* **Modes:** 
  * `dark` (default): Surface `#0B0C11`, subtle `#1C1E2A`, text primary `#F7F7F9`.
  * `light`: Surface `#F7F7F9`, subtle `#EEEEF3`, text primary `#0B0C11`.
  * `warm`: Ivory paper ground (`#FAF9F5`), raised `#FAF9F5`, text `#141413`. (Set via `data-theme="warm"`).
* **Contrast:** 105 text/background pairs pass WCAG 2.2 AA across all three modes.

### 3.2 Typography
* **Display / Titles:** Sora (`font.family.display`)
* **Text / Body:** Geist (`font.family.text`)
* **Code / Timestamps:** Geist Mono (`font.family.mono`)

### 3.3 Orb Component Contract (`web/orb2d.js`)
* **Structure:** A 2D sun composed of a lit core and 24 rays (`component.orb.rays.count`).
* **States & Motion:** State is governed strictly by speed, reach, glow, wave, and sweep parameters—never hue.
* **Performance Caps:** FPS idle 30, active 60, minimized 12, hidden 0. DPR 2, level sampling at 20 Hz.
