# Builder Layout + Hierarchy (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/builder` UI shell to a close-match reference hierarchy (left command rail, dominant center workspace, right assistant workspace) without changing backend behavior.

**Architecture:** This plan is shell-first and layout-only. It keeps generation/export/push/canvas logic intact and restructures visual composition in `BuilderStudio` + `TopBar` with explicit layout contracts and stable test IDs. Tests are updated first (TDD), then minimal implementation, then non-regression verification.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest + React Testing Library, Playwright.

---

## File Structure and Responsibilities

### Modify
- `src/components/studio/BuilderStudio.tsx`
  - Owns shell composition and zone layout contracts.
- `src/components/studio/TopBar.tsx`
  - Aligns top action hierarchy with new shell.
- `tests/unit/studio/builder-studio.test.tsx`
  - Unit tests for shell layout contracts + export non-regression.
- `tests/e2e/builder.spec.ts`
  - E2E smoke for redesigned shell while preserving core flows.

### Create
- `src/components/studio/builder-layout.ts`
  - Shared layout constants/tokens for widths and semantic test IDs.

### Existing files to reference (no functional changes expected)
- `src/components/studio/ChatPanel.tsx`
- `src/components/canvas/GrapesCanvas.tsx`
- `src/components/canvas/GrapesCanvasInner.tsx`

---

## Constraints (must hold for every task)
- No API contract changes.
- No changes to `/api/generate`, `/api/push`, CSRF behavior, or export logic semantics.
- Keep existing interaction test IDs working: `builder-export-zip`, `chat-input`, `chat-send-button`, `chat-settings-toggle`.
- Use immutable update patterns only.

---

## Chunk 1: Shell Foundation and Visual Hierarchy

### Task 1: Define layout contract constants

**Files:**
- Create: `src/components/studio/builder-layout.ts`
- Test: `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Write a failing constants test for layout contracts**

```tsx
import { BUILDER_LAYOUT, BUILDER_TEST_IDS } from '@/components/studio/builder-layout'

test('exports builder layout and test id contracts', () => {
  expect(BUILDER_LAYOUT.commandRailWidth).toBe('w-12')
  expect(BUILDER_LAYOUT.assistantPanelWidth).toBe('w-80')
  expect(BUILDER_TEST_IDS.commandRail).toBe('builder-command-rail')
  expect(BUILDER_TEST_IDS.primaryWorkspace).toBe('builder-primary-workspace')
  expect(BUILDER_TEST_IDS.assistantWorkspace).toBe('builder-assistant-workspace')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx -t "exports builder layout and test id contracts"`
Expected: FAIL because `builder-layout.ts` does not exist yet.

- [ ] **Step 3: Create layout constants module**

```ts
export const BUILDER_LAYOUT = {
  commandRailWidth: 'w-12',
  assistantPanelWidth: 'w-80',
} as const

export const BUILDER_TEST_IDS = {
  commandRail: 'builder-command-rail',
  primaryWorkspace: 'builder-primary-workspace',
  assistantWorkspace: 'builder-assistant-workspace',
} as const
```

- [ ] **Step 4: Run targeted test + typecheck to verify green**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx -t "exports builder layout and test id contracts"`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/builder-layout.ts tests/unit/studio/builder-studio.test.tsx
git commit -m "feat: add builder layout contracts and zone test ids"
```

---

### Task 2: Implement 3-zone shell in BuilderStudio

**Files:**
- Modify: `src/components/studio/BuilderStudio.tsx`
- Test: `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Add failing unit test for hierarchy preservation + existing panels**

```tsx
test('keeps canvas and chat panels inside new workspace zones', () => {
  render(<BuilderStudio />)

  const primaryWorkspace = screen.getByTestId('builder-primary-workspace')
  const assistantWorkspace = screen.getByTestId('builder-assistant-workspace')
  const canvasPanel = screen.getByTestId('builder-canvas-panel')
  const chatPanel = screen.getByTestId('builder-chat-panel')

  expect(primaryWorkspace).toContainElement(canvasPanel)
  expect(assistantWorkspace).toContainElement(chatPanel)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx -t "keeps canvas and chat panels inside new workspace zones"`
Expected: FAIL until layout is restructured.

- [ ] **Step 3: Implement minimal shell restructure in `BuilderStudio`**

```tsx
import { BUILDER_LAYOUT, BUILDER_TEST_IDS } from '@/components/studio/builder-layout'

<div data-testid="builder-studio-shell" className="h-screen flex flex-col ...">
  <TopBar ... />
  <div className="flex flex-1 overflow-hidden">
    <aside data-testid={BUILDER_TEST_IDS.commandRail} className={`${BUILDER_LAYOUT.commandRailWidth} ...`}>...</aside>

    <section data-testid={BUILDER_TEST_IDS.primaryWorkspace} className="flex-1 min-w-0 ...">
      <section data-testid="builder-canvas-panel" className="h-full ...">
        <GrapesCanvas ... />
      </section>
    </section>

    <aside data-testid={BUILDER_TEST_IDS.assistantWorkspace} className={`${BUILDER_LAYOUT.assistantPanelWidth} ...`}>
      <aside data-testid="builder-chat-panel" className="h-full ...">
        <ChatPanel ... />
      </aside>
    </aside>
  </div>
</div>
```

- [ ] **Step 4: Keep export behavior untouched and rerun targeted export tests**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx -t "export"`
Expected: PASS existing export tests.

- [ ] **Step 5: Run full builder studio unit file**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio/BuilderStudio.tsx tests/unit/studio/builder-studio.test.tsx
git commit -m "feat: implement three-zone builder shell layout"
```

---

### Task 3: Align top bar hierarchy with redesigned shell

**Files:**
- Modify: `src/components/studio/TopBar.tsx`
- Test: `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Add failing test for top action presence under redesign**

```tsx
test('keeps top bar actions visible after shell redesign', () => {
  render(<BuilderStudio />)

  expect(screen.getByTestId('builder-top-bar')).toBeDefined()
  expect(screen.getByTestId('builder-export-zip')).toBeDefined()
  expect(screen.queryByTestId('builder-export-error')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails first**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx -t "keeps top bar actions visible after shell redesign"`
Expected: FAIL by asserting a not-yet-implemented top-bar layout contract (for example, a new top-bar container test ID for hierarchy alignment). Do not proceed until failure is observed.

- [ ] **Step 3: Apply minimal style/alignment improvements in `TopBar`**

```tsx
<header data-testid="builder-top-bar" className="h-12 ... border-b ...">
  <div className="...">Lumio AI</div>
  <div className="flex-1" />
  {exportError ? <span data-testid="builder-export-error">...</span> : null}
  <button data-testid="builder-export-zip">Export ZIP</button>
  <button>Push to GitHub</button>
</header>
```

- [ ] **Step 4: Run builder studio unit tests**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/TopBar.tsx tests/unit/studio/builder-studio.test.tsx
git commit -m "refactor: polish top bar hierarchy for builder shell"
```

---

## Chunk 2: Responsive Fit and Regression Hardening

### Task 4: Add responsive shell behavior (layout-only)

**Files:**
- Modify: `src/components/studio/BuilderStudio.tsx`
- Test: `tests/e2e/builder.spec.ts`

- [ ] **Step 1: Add failing E2E assertion for new command rail visibility**

```ts
test('loads the redesigned shell zones', async ({ page }) => {
  await expect(page.getByTestId('builder-command-rail')).toBeVisible()
  await expect(page.getByTestId('builder-primary-workspace')).toBeVisible()
  await expect(page.getByTestId('builder-assistant-workspace')).toBeVisible()
})
```

- [ ] **Step 2: Run E2E test to verify failure first**

Run: `npm run test:e2e -- tests/e2e/builder.spec.ts -g "loads the redesigned shell zones"`
Expected: FAIL before responsive structure is complete.

- [ ] **Step 3: Implement responsive class updates in `BuilderStudio`**

```tsx
import { BUILDER_LAYOUT } from '@/components/studio/builder-layout'

<div className="flex flex-1 overflow-hidden">
  <aside className={`hidden md:flex ${BUILDER_LAYOUT.commandRailWidth} ...`} ... />
  <section className="flex-1 min-w-0 ..." ... />
  <aside className={`${BUILDER_LAYOUT.assistantPanelWidth} max-w-[38vw] ...`} ... />
</div>
```

- [ ] **Step 4: Rerun targeted E2E test**

Run: `npm run test:e2e -- tests/e2e/builder.spec.ts -g "loads the redesigned shell zones"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/studio/BuilderStudio.tsx tests/e2e/builder.spec.ts
git commit -m "feat: add responsive behavior to redesigned builder shell"
```

---

### Task 5: Preserve chat/canvas/generate non-regression with new hierarchy

**Files:**
- Modify: `tests/e2e/builder.spec.ts`
- Modify (if needed): `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Add/adjust failing tests for key flow continuity**

```ts
// E2E: still true after redesign
await expect(page.getByTestId('chat-input')).toBeVisible()
await expect(page.getByTestId('chat-send-button')).toBeVisible()
await expect(page.getByTestId('grapes-canvas-root')).toBeVisible()
```

- [ ] **Step 2: Run affected tests and capture failures**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx`
Run: `npm run test:e2e -- tests/e2e/builder.spec.ts`
Expected: any failures should be layout-contract related only.

- [ ] **Step 3: Make minimal test/selector updates (no behavior edits)**

```ts
// Keep behavior assertions identical, update only shell selectors/contracts if needed.
```

- [ ] **Step 4: Re-run tests until green**

Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx`
Run: `npm run typecheck`
Run: `npm run test:e2e -- tests/e2e/builder.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/studio/builder-studio.test.tsx tests/e2e/builder.spec.ts
git commit -m "test: harden builder non-regression checks after shell redesign"
```

---

### Task 6: Final verification and integration checkpoint

**Files:**
- Modify (only if required): `src/components/studio/BuilderStudio.tsx`
- Modify (only if required): `src/components/studio/TopBar.tsx`
- Modify (only if required): `tests/unit/studio/builder-studio.test.tsx`
- Modify (only if required): `tests/e2e/builder.spec.ts`

- [ ] **Step 1: Run full verification suite**

Run: `npm run typecheck`
Run: `npm run test -- tests/unit/studio/builder-studio.test.tsx tests/unit/studio/chat-panel.test.tsx`
Run: `npm run test:e2e -- tests/e2e/builder.spec.ts`
Expected: PASS.

- [ ] **Step 2: If any test fails, fix minimally and rerun only affected suites first**

Run: `npm run test -- <affected-test-file>`
Expected: PASS.

- [ ] **Step 3: Re-run full verification suite**

Run the same commands from Step 1.
Expected: PASS.

- [ ] **Step 4: Commit final phase-1 checkpoint (only if Task 6 introduced changes)**

```bash
git add src/components/studio/BuilderStudio.tsx src/components/studio/TopBar.tsx tests/unit/studio/builder-studio.test.tsx tests/e2e/builder.spec.ts src/components/studio/builder-layout.ts
git commit -m "feat: complete builder phase-1 layout and hierarchy redesign"
```

If the working tree is already clean after verification, skip this commit and mark Task 6 complete.

---

## Delivery Notes for Implementers
- Keep PR/task scope strictly to Phase 1 shell/layout hierarchy.
- Do not redesign internal ChatPanel behaviors in this plan.
- Do not modify backend routes, codegen, or push/export service internals.
- If Playwright browser binaries are missing locally, install once before E2E run: `npx playwright install`.

---

## Skills and Workflow Requirements
- Use `superpowers:subagent-driven-development` to execute this plan.
- Use `superpowers:test-driven-development` for each task (RED → GREEN → REFACTOR).
- Use `superpowers:requesting-code-review` after each major task batch.
- Use `superpowers:finishing-a-development-branch` after all tasks are complete.
