# Builder Layout + Hierarchy Redesign (Phase 1)

## 1) Scope and Objective

### Objective
Redesign the **Builder page UI** in a controlled, part-by-part rollout with a visual style that is a **close match** to the provided reference, while preserving all current backend-powered functionality.

### In Scope (Phase 1)
- Builder shell layout and hierarchy
- Spatial rhythm (panel proportions, spacing, borders, visual weight)
- Responsive layout behavior for builder zones
- UI regression hardening for key flows

### Out of Scope (Phase 1)
- Backend logic changes
- API contract changes
- Generation pipeline behavior changes
- Export/push service behavior changes
- Deep internal redesign of chat/canvas controls beyond layout-driven styling

---

## 2) Approved Design Direction

### Chosen starting point
- **Builder page first**
- **Layout + hierarchy first**
- **Close-match reference style** adapted to Lumio’s components and flows

### Chosen implementation strategy
Adopt a **shell-first structural redesign** before deeper panel internals.

Why this is chosen:
- Safest way to preserve current behavior
- Delivers visible quality improvement quickly
- Minimizes risk while enabling iterative refinement

---

## 3) Target Layout Architecture

A three-zone builder shell:

1. **Left command rail (narrow, fixed)**
   - Compact global action/mode rail
   - Stable width, visually quiet

2. **Center primary workspace (dominant, fluid)**
   - Canvas remains the hero area
   - Maximum visual emphasis and available space

3. **Right assistant workspace (controlled width)**
   - Chat/workflow assistant area
   - Conversation region + sticky input structure

### Hierarchy rules
- Center zone is dominant by area and emphasis
- Right zone is clearly secondary but always usable
- Left zone stays compact and stable
- Unified spacing rhythm across all panel boundaries
- Subtle surfaces and borders; reduced visual noise
- Typography contrast signals importance

---

## 4) Component Boundaries and Responsibilities

### Builder shell orchestration
- `BuilderStudio` remains the orchestration layer for layout composition
- Existing functional props and behavior contracts remain unchanged

### Visual container contracts
- Canvas wrapper: surface, spacing, border, and emphasis contract
- Chat wrapper: surface, spacing, and sticky input framing contract
- Header/action strip: action alignment and status placement contract

### Constraint
No functional ownership migration in Phase 1. This phase is a presentation-layer architecture update.

---

## 5) Data Flow and State Constraints

### Allowed state changes (Phase 1)
- Layout state only: zone sizing, collapse flags (if introduced), responsive behavior state

### Forbidden state/flow changes (Phase 1)
- `/api/generate` request/stream behavior
- CSRF readiness/send gating behavior
- Canvas injection behavior
- Export/push backend interactions

### Rationale
Decouple visual redesign risk from backend flow risk to keep rollout safe and testable.

---

## 6) Error and Feedback Presentation Rules

UI-level standardization only:
- Keep chat errors in assistant zone with consistent inline alert treatment
- Keep async status language consistent (e.g., preparing/generating)
- Prefer contextual inline feedback over new modal flows

No semantic error behavior changes in this phase.

---

## 7) Testing and Verification Strategy

### Unit/UI verification
- Builder shell renders three zones with stable test targets
- Primary workspace remains visible and dominant
- Assistant zone and input remain accessible

### E2E smoke verification
- Builder loads with redesigned hierarchy
- Chat input/send path still works
- Settings toggle behavior remains intact
- Export action remains available and usable

### Regression checks
- Existing mocked generate flow remains passing
- Existing CSRF gating behavior remains passing
- No accessibility regressions introduced by the layout shift

---

## 8) Phased Implementation Plan (Design-Level)

### Phase 1a — Shell skeleton
- Introduce three-zone structural shell
- Establish width contracts and layout containers
- Apply base surface/spacing tokens

**Completion criteria:** New hierarchy is visible; existing functionality unchanged.

### Phase 1b — Hierarchy polish
- Refine spacing rhythm and panel balance
- Normalize action alignment and text hierarchy
- Improve visual coherence to match reference direction

**Completion criteria:** Builder shell feels cohesive and close to target style.

### Phase 1c — Responsive behavior
- Define and implement target breakpoints
- Preserve center workspace priority on narrower widths
- Keep assistant interaction usable

**Completion criteria:** Layout remains readable and usable across target viewport range.

### Phase 1d — Regression hardening
- Update tests to new layout contracts
- Run non-regression validation for generate/settings/export/push flows
- Fix discovered regressions

**Completion criteria:** All targeted checks pass with no functional regression.

---

## 9) Risks and Mitigations

### Risk: layout polish accidentally impacts behavior
- **Mitigation:** enforce phase constraint (layout-only changes first), keep business flows untouched

### Risk: responsive changes degrade canvas usability
- **Mitigation:** define center-priority rules and verify with viewport-based tests

### Risk: visual drift from reference quality
- **Mitigation:** explicit hierarchy rules + staged visual checkpoints before internal panel redesign

---

## 10) Success Criteria for Phase 1

- Builder visual hierarchy clearly improved and reference-aligned
- No backend or contract behavior change
- Core user flows remain intact
- Tests updated and passing for redesigned shell contracts
- Foundation prepared for subsequent part-by-part redesign phases
