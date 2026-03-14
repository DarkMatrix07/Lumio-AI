# Backend Builder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional backend builder that matches the requested palette, lets users add and edit backend blocks from the Studio UI, persists them in the backend graph store, validates them correctly, and includes them in generated backend files.

**Architecture:** Extend the existing typed backend graph model instead of introducing a parallel abstraction. Implement the backend tab as a real Studio workspace with palette metadata, hierarchy, and properties panels backed by `useBackendGraphStore`, then extend validator/codegen so every backend block is recognized and emitted as concrete generated files or explicit stubs.

**Tech Stack:** React, Next.js, TypeScript, Zustand, Vitest, Testing Library

---

## File map

**Modify**
- `src/types/lumio.ts` — extend backend node types and template-safe unions for new backend blocks.
- `src/store/backend-graph-store.ts` — ensure new node types can be added with safe default configs and selected correctly.
- `src/lib/backend/graph-validator.ts` — validate required config for new auth, logic, and configuration nodes.
- `src/lib/backend/codegen.ts` — generate helper/stub files for new backend blocks and annotate middleware/routes accordingly.
- `src/components/studio/BuilderStudio.tsx` — replace backend placeholder panel with real backend builder UI and wire it to store actions.
- `tests/unit/backend/graph-validator.test.ts` — add failing tests for missing config on new block types and valid graph cases.
- `tests/unit/backend/codegen.test.ts` — add failing tests for new generated helpers/stubs and middleware comments.
- `tests/unit/studio/builder-studio.test.tsx` — add failing tests for backend palette rendering, node insertion, hierarchy, and properties editing.

**Create**
- `src/components/studio/backend-palette.ts` — single source of truth for backend palette sections, labels, icons, and default node factories.
- `src/components/studio/BackendPanel.tsx` — backend builder left/center/right workspace extracted from `BuilderStudio`.
- `src/components/studio/backend-properties.tsx` — focused node property form renderer by backend node type.
- `tests/unit/studio/backend-panel.test.tsx` — focused tests for backend panel behaviors if `BuilderStudio` tests become too broad.

**Reference**
- `src/lib/backend/templates.ts` — keep template expansion aligned with the new node types.
- `src/components/studio/builder-layout.ts` — reuse layout/test-id conventions instead of inventing new ones.

---

## Chunk 1: Backend domain model and validator

### Task 1: Extend backend node types

**Files:**
- Modify: `src/types/lumio.ts:1-27`
- Test: `tests/unit/backend/graph-validator.test.ts`

- [ ] **Step 1: Write the failing validator tests for the new node types**

Add tests covering missing required config for:
- `ApiKey` → `config.key`
- `OAuth` → `config.provider`
- `Session` → `config.strategy`
- `Validation` → `config.schema`
- `IfElse` → `config.condition`
- `Loop` → `config.iterator`
- `TryCatch` → `config.tryLabel` or `config.handler`

Also add one passing test with all required fields present.

Run:
```bash
npm test -- tests/unit/backend/graph-validator.test.ts
```
Expected: FAIL because the new node types are not fully represented/validated yet.

- [ ] **Step 2: Extend the backend node union**

Update `src/types/lumio.ts` so `LUMIO_STANDARD_NODE_TYPES` includes:
```ts
'ApiKey',
'OAuth',
'Session',
'IfElse',
'Loop',
'TryCatch',
'Validation',
```
Keep existing internal names:
```ts
'JWT',
'RateLimit',
'CustomMiddleware',
'EnvVar',
```

- [ ] **Step 3: Run the validator test again**

Run:
```bash
npm test -- tests/unit/backend/graph-validator.test.ts
```
Expected: FAIL with missing validation branches for the new types.

- [ ] **Step 4: Add minimal validator support for the new node types**

Extend `validateBackendGraph` in `src/lib/backend/graph-validator.ts` with type-specific checks similar to the current `EnvVar`, `CustomMiddleware`, and `RateLimit` rules.

Use string trimming helpers for text fields and direct presence checks for numeric/boolean config.

- [ ] **Step 5: Run validator tests to green**

Run:
```bash
npm test -- tests/unit/backend/graph-validator.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit the domain model + validator slice**

```bash
git add src/types/lumio.ts src/lib/backend/graph-validator.ts tests/unit/backend/graph-validator.test.ts
git commit -m "feat: extend backend graph node types"
```

---

### Task 2: Prepare default node creation metadata

**Files:**
- Create: `src/components/studio/backend-palette.ts`
- Modify: `src/store/backend-graph-store.ts:1-131`
- Test: `tests/unit/studio/backend-panel.test.tsx`

- [ ] **Step 1: Write the failing test for default backend node insertion**

Add a test that clicks a palette item and expects a graph node with sane defaults, for example:
- `GET` gets `config.path: '/resource'`
- `ApiKey` gets `config.key: 'X_API_KEY'`
- `RateLimit` gets `config.limit` and `config.windowMs`
- `Session` gets `config.strategy: 'cookie'`

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx
```
Expected: FAIL because no backend panel/default factory exists yet.

- [ ] **Step 2: Create backend palette metadata**

Create `src/components/studio/backend-palette.ts` exporting:
- section definitions matching the screenshots (`Endpoints`, `Database`, `Authentication`, `Logic`, `Middleware`, `Configuration`, `Templates`)
- display labels (`JWT Auth`, `Rate Limit`, `Env Variable`, `Custom`)
- a factory per item returning an immutable `LumioGraphNode`

Keep all factories pure and focused.

- [ ] **Step 3: Make store insertion work cleanly with new node defaults**

If necessary, add small helpers in `src/store/backend-graph-store.ts` so adding a node clones config safely and selects the inserted node.

Do not add store-specific UI metadata.

- [ ] **Step 4: Run the focused node insertion test**

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx
```
Expected: PASS or move to the next failing UI assertion if the panel is still pending.

- [ ] **Step 5: Commit the palette metadata slice**

```bash
git add src/components/studio/backend-palette.ts src/store/backend-graph-store.ts tests/unit/studio/backend-panel.test.tsx
git commit -m "feat: add backend palette metadata"
```

---

## Chunk 2: Backend Studio UI

### Task 3: Replace the backend placeholder with a real backend panel

**Files:**
- Create: `src/components/studio/BackendPanel.tsx`
- Modify: `src/components/studio/BuilderStudio.tsx:211-430`
- Test: `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Write the failing Studio test for backend panel rendering**

Add tests that:
- open the Backend tab
- expect grouped section labels to appear
- expect items like `GET`, `Model`, `JWT Auth`, `API Key`, `If / Else`, `CORS`, `Env Variable`, `Auth System`
- expect the empty state to say there are no backend services yet

Run:
```bash
npm test -- tests/unit/studio/builder-studio.test.tsx
```
Expected: FAIL because the backend tab still renders the placeholder text from `BuilderStudio`.

- [ ] **Step 2: Extract a dedicated `BackendPanel` component**

Create `src/components/studio/BackendPanel.tsx` to render:
- search field
- grouped palette sections
- center workspace with empty state / service container area
- hierarchy panel
- properties panel
- footer buttons for `Generate Code` and `Export ZIP`

Keep `BuilderStudio` responsible only for tab switching/layout orchestration.

- [ ] **Step 3: Replace the placeholder backend block**

In `src/components/studio/BuilderStudio.tsx`, replace the placeholder content at the backend branch with `<BackendPanel />` and pass only the minimal handlers needed.

- [ ] **Step 4: Run the Studio test**

Run:
```bash
npm test -- tests/unit/studio/builder-studio.test.tsx
```
Expected: FAIL on interaction details if rendering is now correct.

- [ ] **Step 5: Commit the backend panel shell**

```bash
git add src/components/studio/BackendPanel.tsx src/components/studio/BuilderStudio.tsx tests/unit/studio/builder-studio.test.tsx
git commit -m "feat: add backend builder panel"
```

---

### Task 4: Add palette search, node insertion, hierarchy, and selection

**Files:**
- Modify: `src/components/studio/BackendPanel.tsx`
- Modify: `src/components/studio/backend-palette.ts`
- Test: `tests/unit/studio/backend-panel.test.tsx`
- Test: `tests/unit/studio/builder-studio.test.tsx`

- [ ] **Step 1: Write the failing interaction tests**

Add tests for:
- searching backend items filters visible cards
- clicking `Create Service` creates/opens a backend service container state if needed
- clicking a palette item adds a graph node
- hierarchy count increments
- clicking a hierarchy item selects the node

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx tests/unit/studio/builder-studio.test.tsx
```
Expected: FAIL because these interactions are not wired yet.

- [ ] **Step 2: Implement search and filtered sections**

Use the palette metadata as the single source of truth and filter by item label/keywords only.

- [ ] **Step 3: Implement node insertion**

On palette click:
- create a default node via the palette factory
- call `useBackendGraphStore.getState().addNode(...)` or store hooks
- ensure the inserted node becomes selected

- [ ] **Step 4: Implement hierarchy rendering**

Render current graph nodes in insertion/layout order with:
- total count
- selected state
- empty hierarchy message when there are no nodes

- [ ] **Step 5: Run the interaction tests to green**

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx tests/unit/studio/builder-studio.test.tsx
```
Expected: PASS

- [ ] **Step 6: Commit hierarchy and insertion behavior**

```bash
git add src/components/studio/BackendPanel.tsx src/components/studio/backend-palette.ts tests/unit/studio/backend-panel.test.tsx tests/unit/studio/builder-studio.test.tsx
git commit -m "feat: wire backend palette interactions"
```

---

### Task 5: Add a type-aware properties editor

**Files:**
- Create: `src/components/studio/backend-properties.tsx`
- Modify: `src/components/studio/BackendPanel.tsx`
- Test: `tests/unit/studio/backend-panel.test.tsx`

- [ ] **Step 1: Write the failing properties tests**

Cover at least these cases:
- selecting `GET` shows editable path input
- selecting `Model` shows editable model name input
- selecting `ApiKey` shows key input
- selecting `RateLimit` shows limit/window inputs
- selecting `Validation` shows schema input
- editing a field updates `useBackendGraphStore`

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx
```
Expected: FAIL because no properties editor exists yet.

- [ ] **Step 2: Create a focused properties renderer**

Create `src/components/studio/backend-properties.tsx` with small render branches per node type.

Prefer plain controlled inputs and minimal branching helpers over one giant switch in `BuilderStudio`.

- [ ] **Step 3: Wire property edits to the store**

Use `updateNodeConfig(nodeId, configPatch)` and preserve immutable config updates.

- [ ] **Step 4: Run the properties tests**

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit the properties editor**

```bash
git add src/components/studio/backend-properties.tsx src/components/studio/BackendPanel.tsx tests/unit/studio/backend-panel.test.tsx
git commit -m "feat: add backend node properties editor"
```

---

## Chunk 3: Templates and code generation

### Task 6: Keep templates aligned with the expanded backend builder

**Files:**
- Modify: `src/lib/backend/templates.ts:1-151`
- Test: `tests/unit/studio/backend-panel.test.tsx`
- Test: `tests/unit/backend/graph-validator.test.ts`

- [ ] **Step 1: Write the failing template behavior test**

Add tests asserting that template insertion still expands to valid graph nodes and that the resulting graph passes validation.

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx tests/unit/backend/graph-validator.test.ts
```
Expected: FAIL if the new palette/template path is not aligned.

- [ ] **Step 2: Update templates only where necessary**

Keep the existing template kinds:
- `AuthSystem`
- `CrudApi`
- `ChatSystem`

Only add new nodes to templates if they improve correctness without bloating the generated graph.

- [ ] **Step 3: Run the template tests**

Run:
```bash
npm test -- tests/unit/studio/backend-panel.test.tsx tests/unit/backend/graph-validator.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit template alignment**

```bash
git add src/lib/backend/templates.ts tests/unit/studio/backend-panel.test.tsx tests/unit/backend/graph-validator.test.ts
git commit -m "test: keep backend templates aligned"
```

---

### Task 7: Extend backend code generation for the new block set

**Files:**
- Modify: `src/lib/backend/codegen.ts:1-125`
- Test: `tests/unit/backend/codegen.test.ts`

- [ ] **Step 1: Write the failing codegen tests**

Add tests for:
- `ApiKey` generates `lib/auth/api-key.ts`
- `OAuth` generates an auth stub file such as `lib/auth/oauth.ts`
- `Session` generates a session stub file such as `lib/auth/session.ts`
- `Validation` adds validation comments/stub logic into route generation or a helper file
- `IfElse`, `Loop`, `TryCatch` appear in generated output as explicit workflow stubs/comments
- middleware output reflects configured `CORS`, `RateLimit`, `Logger`, `CustomMiddleware`
- env vars are surfaced in generated comments or `.env.example`-style output if you decide to add one

Run:
```bash
npm test -- tests/unit/backend/codegen.test.ts
```
Expected: FAIL because the current generator only understands JWT and a small middleware subset.

- [ ] **Step 2: Implement minimal but explicit code generation**

Extend `src/lib/backend/codegen.ts` to:
- generate helpers only when the corresponding nodes exist
- keep route generation deterministic
- emit stubs/comments instead of silently ignoring logic nodes
- preserve existing JWT behavior

Do not over-engineer runtime execution of workflow nodes; generated explicit placeholders are enough for this phase as long as the block is represented functionally in output.

- [ ] **Step 3: Run codegen tests to green**

Run:
```bash
npm test -- tests/unit/backend/codegen.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit code generation support**

```bash
git add src/lib/backend/codegen.ts tests/unit/backend/codegen.test.ts
git commit -m "feat: extend backend code generation"
```

---

## Chunk 4: Full verification

### Task 8: Verify the backend builder end to end at the unit level

**Files:**
- Modify: `tests/unit/studio/builder-studio.test.tsx`
- Modify: `tests/unit/studio/backend-panel.test.tsx`
- Modify: `tests/unit/backend/codegen.test.ts`
- Modify: `tests/unit/backend/graph-validator.test.ts`

- [ ] **Step 1: Run the targeted backend suite**

Run:
```bash
npm test -- tests/unit/backend/codegen.test.ts tests/unit/backend/graph-validator.test.ts tests/unit/studio/backend-panel.test.tsx tests/unit/studio/builder-studio.test.tsx
```
Expected: PASS

- [ ] **Step 2: Run the broader Studio/backend-adjacent suite**

Run:
```bash
npm test -- tests/unit/studio tests/unit/backend
```
Expected: PASS

- [ ] **Step 3: Run the full test command used by the repo for confidence**

If available from project scripts, run:
```bash
npm test
```
Or the closest non-interactive equivalent defined in `package.json`.

Expected: PASS or only unrelated known failures.

- [ ] **Step 4: Review the changed diff**

Check for:
- placeholder backend UI removed
- no mutation bugs in store updates
- no unsupported node types left unhandled in validator/codegen/properties
- test coverage added for each new category

- [ ] **Step 5: Commit the verification slice**

```bash
git add tests/unit/backend/codegen.test.ts tests/unit/backend/graph-validator.test.ts tests/unit/studio/backend-panel.test.tsx tests/unit/studio/builder-studio.test.tsx
git commit -m "test: verify backend builder workflow"
```

---

## Notes for the implementer

- Keep files focused. Do not grow `BuilderStudio.tsx` further; extract backend-specific UI into its own files.
- Prefer display labels in palette metadata rather than leaking internal enum names into the UI.
- Use immutable updates everywhere, especially when editing node config.
- YAGNI: workflow nodes (`IfElse`, `Loop`, `TryCatch`) only need meaningful config, validation, properties, and generated stubs/comments in this phase. Do not build a full execution engine.
- Reuse existing export flow in `BuilderStudio`; do not create a second ZIP/export system.
- If `tests/unit/studio/backend-panel.test.tsx` is not necessary because `builder-studio.test.tsx` remains manageable, you may keep tests consolidated — but prefer a focused test file if Studio tests become noisy.

Plan complete and saved to `docs/superpowers/plans/2026-03-14-backend-builder.md`. Ready to execute?