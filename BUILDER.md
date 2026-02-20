# CMS / Site Builder — Plan

## Overview

A custom git-based visual site builder integrated into the FancyUI component library. It renders pages from JSON documents using the existing 50+ implemented Svelte 5 components, with a drag-and-drop editor for composing pages visually.

**Audience:** Admin deployed (accessible in prod, with auth)
**Storage:** Local filesystem first, GitHub API later
**Approach:** Custom builder (no existing CMS supports Svelte 5 snippets + FancyUI props)

---

## Architecture

```
content/pages/*.json          → Page documents (git-tracked)
src/lib/builder/              → Core library (types, registry, renderer, utils)
src/routes/pages/[slug]/      → Public page rendering
src/routes/builder/           → Visual editor (protected)
src/routes/api/builder/       → Storage API endpoints (protected)
```

### Page Document Format

Each page = a JSON file in `content/pages/`:

```json
{
  "version": 1,
  "meta": { "title": "...", "slug": "...", "status": "draft|published", ... },
  "body": [
    {
      "id": "nanoid-12",
      "type": "_section",
      "props": { "padding": "py-16 px-4" },
      "children": [
        { "id": "...", "type": "sparkles-text", "props": { "text": "Hello" } }
      ]
    }
  ]
}
```

### Component Types

- **Layout primitives** (prefixed `_`): `_section`, `_container`, `_grid`, `_flex`, `_text`, `_image`, `_spacer`
- **FancyUI components**: 15+ components with full prop schemas (BorderBeam, GlowBorder, Meteors, ShimmerButton, RainbowButton, Marquee, Ripple, SparklesText, ColourfulText, NumberTicker, FlipWords, CardSpotlight, NeonBorder, LetterPullup, BoxReveal)
- **Adapters**: Wrappers for multi-snippet components (FlipCard, BentoGridItem, ContainerScroll, ShimmerButton, RainbowButton)

### Editor Layout (Phase 2+)

```
+----------------------------------------------------------+
|  TopBar: [←] Page Title | Breakpoints | Save | Publish   |
+--------+--------------------------------+----------------+
| LEFT   |         CENTER CANVAS          |    RIGHT       |
| 240px  |   Live preview of page tree    |    320px       |
| Palette|   Click = select               | Props editor   |
| drag-  |   Blue border = selected       | for selected   |
| gable  |   Dashed = drop zone           | block          |
+--------+--------------------------------+----------------+
| Layer tree (hierarchical)               |                |
+-----------------------------------------+----------------+
```

---

## Phases

### Phase 1: Infrastructure Core ✅

**Status: DONE**

Types, registry, renderer, utilities, and public page route.

#### Files Created

```
src/lib/builder/
├── index.ts                              # Barrel export
├── types/
│   ├── page.ts                           # PageDocument, BlockNode, PageMeta
│   ├── registry.ts                       # PropSchema (7 variants), BuilderComponentMeta
│   └── index.ts
├── registry/
│   ├── builder-registry.ts               # 22 components (7 primitives + 15 FancyUI)
│   └── index.ts
├── renderer/
│   ├── component-map.ts                  # slug → Svelte component map
│   ├── BlockRenderer.svelte              # Recursive renderer
│   ├── PageRenderer.svelte               # Full page renderer
│   ├── index.ts
│   ├── primitives/
│   │   ├── Section.svelte
│   │   ├── Container.svelte
│   │   ├── Grid.svelte
│   │   ├── Flex.svelte
│   │   ├── Text.svelte
│   │   ├── Image.svelte
│   │   └── Spacer.svelte
│   └── adapters/
│       ├── ShimmerButtonAdapter.svelte
│       ├── RainbowButtonAdapter.svelte
│       ├── FlipCardAdapter.svelte
│       ├── BentoGridItemAdapter.svelte
│       └── ContainerScrollAdapter.svelte
└── utils/
    ├── id.ts                             # createBlockId() (nanoid)
    ├── tree.ts                           # findNode, removeNode, insertNode, moveNode, ...
    └── index.ts

src/routes/pages/[slug]/
├── +page.server.ts                       # Loads JSON from content/pages/
└── +page.svelte                          # Renders with PageRenderer

content/
├── pages/test.json                       # Test page (6 sections, all component types)
├── _drafts/
└── _templates/
```

#### Verification

- `/pages/test` → renders all sections correctly (200 OK)
- `/pages/nonexistent` → 404
- `pnpm check` → 0 new errors

#### Dependencies Added

- `nanoid` (runtime)
- `@types/node` (dev)

---

### Phase 2: Editor UI ✅

**Status: DONE**

Visual editor with 3 panels: palette, canvas, property panel.

#### Deliverables

- **Editor state store** (`src/lib/builder/stores/editor.svelte.ts`)
  - Selected block ID, page document (reactive), undo/redo stack
  - Svelte 5 runes (`$state`, `$derived`) + context (`setContext`/`getContext`)
- **EditorLayout.svelte** — 3-panel responsive layout
- **TopBar.svelte** — page title, breakpoint toggle, save/publish buttons
- **ComponentPalette.svelte** + **PaletteItem.svelte** — browsable list of components grouped by category
- **Canvas.svelte** — live preview area, click to select blocks
- **BlockWrapper.svelte** — wraps each block in the canvas with selection border + toolbar (move up/down, delete)
- **PropertyPanel.svelte** — edits props of the selected block
- **Prop editors** (5 types): StringEditor, NumberEditor, BooleanEditor, ColorEditor, SelectEditor
- **LayerTree.svelte** — hierarchical view of the block tree

#### Files

```
src/lib/builder/
├── stores/
│   └── editor.svelte.ts
├── editor/
│   ├── EditorLayout.svelte
│   ├── TopBar.svelte
│   ├── ComponentPalette.svelte
│   ├── PaletteItem.svelte
│   ├── Canvas.svelte
│   ├── BlockWrapper.svelte
│   ├── PropertyPanel.svelte
│   ├── LayerTree.svelte
│   └── props/
│       ├── StringEditor.svelte
│       ├── NumberEditor.svelte
│       ├── BooleanEditor.svelte
│       ├── ColorEditor.svelte
│       └── SelectEditor.svelte

src/routes/builder/
├── +layout.svelte
├── +page.svelte                          # Dashboard / page list
└── [slug]/
    ├── +page.svelte                      # Editor for a specific page
    └── +page.ts                          # Load page data
```

---

### Phase 3: Drag-and-Drop ✅

**Status: DONE**

Custom pointer-based drag-and-drop (zero dependencies, mobile-ready).

#### Deliverables

- **Palette → Canvas**: drag a component from the palette to create a new BlockNode with default props
- **Canvas → Canvas**: reorder/reparent blocks via pointer events + `elementFromPoint` hit-testing
- **Layer tree reorder**: drag blocks in the layer tree (with auto-expand on hover)
- **Drop zone validation**: prevents self-drop, circular reference (ancestor → descendant)
- **Visual indicators**: blue line for before/after, blue tint for inside, opacity on dragged block
- **Drag overlay**: floating card with component icon/name following the pointer

#### Approach

Pointer-based (not HTML5 DnD or external library):
- `pointerdown` + movement threshold to distinguish click from drag
- Global `pointermove` / `pointerup` listeners during drag
- `document.elementsFromPoint()` to find `[data-drop-id]` targets
- `calculateDropPosition()` for spatial hit zones (25/50/25% for containers, 50/50 for leaves)

#### Files

```
New:
  src/lib/builder/utils/drag.ts                 — calculateDropPosition, isValidDrop, DRAG_THRESHOLD
  src/lib/builder/editor/DragOverlay.svelte     — floating drag preview

Modified:
  src/lib/builder/stores/editor.svelte.ts       — DragSource/DropTarget types, drag state + methods
  src/lib/builder/editor/PaletteItem.svelte     — pointer-based drag start
  src/lib/builder/editor/BlockWrapper.svelte     — drag source (grip handle) + drop target
  src/lib/builder/editor/Canvas.svelte           — global drag coordination + root drop zone
  src/lib/builder/editor/LayerTreeNode.svelte    — tree drag + drop
  src/lib/builder/editor/EditorLayout.svelte     — body cursor/user-select during drag
  src/lib/builder/utils/tree.ts                  — findParentId utility
  src/lib/builder/utils/index.ts                 — barrel exports
```

---

### Phase 4: Live Preview ✅

**Status: DONE**

Wire reactive updates between editor state and the canvas.

#### Deliverables

- **Reactive canvas**: modifying props in the property panel instantly updates the preview (already worked via Svelte 5 runes since Phase 2)
- **Edit/Interact toggle**: `pointer-events: none` on components in edit mode, `pointer-events: auto` in interact mode
- **Responsive preview**: CSS `zoom` for mobile/tablet/desktop breakpoints with `ResizeObserver` + viewport dimension label
- **Inline text editing**: double-click a `_text` block to edit content directly via `contenteditable`

#### Files Modified

- `src/lib/builder/stores/editor.svelte.ts` — added `mode`, `inlineEditBlockId`, `toggleMode()`, `startInlineEdit()`, `stopInlineEdit()`
- `src/lib/builder/editor/TopBar.svelte` — added Edit/Interact toggle button (MousePointer/Hand icons)
- `src/lib/builder/editor/BlockWrapper.svelte` — pointer-events-none in edit mode, hide selection UI in interact mode, dblclick for inline editing
- `src/lib/builder/editor/Canvas.svelte` — ResizeObserver + CSS zoom for responsive preview, viewport label, disabled deselect in interact mode
- `src/lib/builder/editor/CanvasBlockRenderer.svelte` — conditional InlineTextEditor rendering for `_text` blocks
- `src/lib/builder/editor/InlineTextEditor.svelte` — **new**, contenteditable component matching `_text` block styling

---

### Phase 5: Storage + Auth ✅

**Status: DONE**

Persist pages and protect the editor.

#### Deliverables

- **PageStorage interface** (`src/lib/builder/storage/types.ts`)
  - `list()`, `get(slug)`, `save(page)`, `delete(slug)`, `publish(slug)`
  - Shared validators: `isValidSlug()`, `isValidPageDocument()`
- **Filesystem implementation** (`storage/filesystem.server.ts`)
  - Auto-creates `content/pages/` dir, sets `updatedAt` on save
  - API routes: `POST /api/builder/pages`, `GET/PUT/DELETE /api/builder/pages/[slug]`, `POST /api/builder/publish`
  - Input validation: slug format, JSON body parsing, PageDocument schema
- **IndexedDB auto-save** (`storage/indexeddb.ts`)
  - 5-second debounced draft save to IndexedDB (client-side, raw API — no `idb` dependency)
  - `AutoSave.svelte` — mounted in editor, "Draft saved" indicator
  - `DraftRecoveryBanner.svelte` — restore/discard banner on reload if draft is newer
  - Draft cleared after successful server save
- **Dashboard CRUD** (`/builder` page)
  - Create new page (`/builder/new`) with auto-slug
  - Duplicate and delete buttons per page card
- **GitHub OAuth** authentication via `arctic`
  - Login/callback/logout routes (`/auth/login`, `/auth/callback`, `/auth/logout`)
  - `hooks.server.ts` middleware protecting `/builder/**` and `/api/builder/**`
  - HMAC-signed httpOnly session cookie (stateless, survives restarts)
  - Whitelist of authorized GitHub usernames (`GITHUB_ALLOWED_USERS`)
  - Dev bypass: auth skipped when env vars not configured
- **TopBar save** — `fetch PUT` with loading/success/error states, `updatedAt` sync from server response

#### Dependencies Added

| Package | Size | Usage |
|---------|------|-------|
| `arctic` | ~15KB | GitHub OAuth |

#### Files

```
New:
  src/lib/builder/storage/
  ├── types.ts                            # PageStorage interface + validators
  ├── filesystem.server.ts                # Filesystem implementation
  ├── indexeddb.ts                        # IndexedDB draft save/get/delete
  └── index.ts

  src/lib/builder/editor/
  ├── AutoSave.svelte                     # 5s debounced IndexedDB auto-save
  └── DraftRecoveryBanner.svelte          # Draft recovery banner

  src/lib/server/auth/
  ├── github.ts                           # Arctic GitHub client + allowlist
  ├── session.ts                          # HMAC-signed session cookies
  └── index.ts

  src/routes/api/builder/
  ├── pages/+server.ts                    # POST (create)
  ├── pages/[slug]/+server.ts             # GET, PUT, DELETE
  └── publish/+server.ts                  # POST (set status to published)

  src/routes/auth/
  ├── login/+server.ts                    # GitHub OAuth redirect
  ├── callback/+server.ts                 # OAuth callback + whitelist check
  └── logout/+server.ts                   # Clear session cookie

  src/routes/builder/
  ├── +layout.server.ts                   # Pass user to layout
  └── new/+page.svelte                    # Create page form

  src/hooks.server.ts                     # Auth middleware (dev bypass)
  .env.example                            # OAuth + session env vars template

Modified:
  src/app.d.ts                            # App.Locals.user
  src/routes/builder/+layout.svelte       # Username + logout header
  src/routes/builder/+page.svelte         # Delete/duplicate buttons
  src/routes/builder/+page.server.ts      # Uses storage.list()
  src/routes/builder/[slug]/+page.server.ts # Uses storage.get()
  src/routes/pages/[slug]/+page.server.ts # Uses storage.get()
  src/lib/builder/editor/TopBar.svelte    # fetch PUT save + draft cleanup
  src/lib/builder/editor/EditorLayout.svelte # Mounts AutoSave + DraftRecoveryBanner
```

---

### Phase 6: Polish

**Status: TODO**

UX refinements and completeness.

#### Deliverables

- **Undo/Redo** — command stack in editor store, Cmd+Z / Cmd+Shift+Z
- **Copy/Paste** — Cmd+C / Cmd+V on selected blocks
- **Keyboard shortcuts** — Cmd+S (save), Delete/Backspace (remove block), arrow keys (navigate tree)
- **Page templates** — starter templates in `content/_templates/` (blank, landing, portfolio)
- **Version history UI** — git log viewer showing page change history
- **Complete registry** — expand from 15 to ~35 builder-compatible components
- **SEO/Meta editor** — edit title, description, OG tags in the property panel
- **Tests** — unit tests for renderer, storage, editor store
  - Tree utils: ✅ done (29 tests)
  - BlockRenderer / PageRenderer: pending (render with mock data, unknown component fallback, prop sanitization)
  - Storage + editor store: pending (write alongside Phase 5)

---

### Phase 7: Preview Iframe

**Status: TODO**

Replace inline canvas rendering with an isolated iframe for pixel-perfect preview.

#### Deliverables

- **Preview route** (`/builder/preview`) — renders a PageDocument in isolation
- **PostMessage bridge** — editor sends JSON state to iframe on each change
- **CSS isolation** — editor styles cannot leak into the preview
- **Native responsive** — resize the iframe element for mobile/tablet/desktop
- **Shareable preview URL** — link to preview a draft page

---

## File Structure (Complete)

```
src/lib/builder/
├── index.ts
├── types/
│   ├── page.ts
│   ├── registry.ts
│   └── index.ts
├── registry/
│   ├── builder-registry.ts
│   └── index.ts
├── renderer/
│   ├── component-map.ts
│   ├── BlockRenderer.svelte
│   ├── PageRenderer.svelte
│   ├── index.ts
│   ├── primitives/ (7 files)
│   └── adapters/ (5 files)
├── editor/
│   ├── EditorLayout.svelte
│   ├── TopBar.svelte
│   ├── ComponentPalette.svelte
│   ├── PaletteItem.svelte
│   ├── Canvas.svelte
│   ├── BlockWrapper.svelte
│   ├── PropertyPanel.svelte
│   ├── LayerTree.svelte
│   └── props/ (5 editors)
├── stores/
│   └── editor.svelte.ts
├── storage/
│   ├── types.ts
│   ├── filesystem.server.ts
│   ├── indexeddb.ts
│   └── index.ts
└── utils/
    ├── id.ts
    ├── tree.ts
    ├── drag.ts
    └── index.ts

src/routes/builder/
├── +layout.svelte
├── +layout.server.ts
├── +page.svelte
├── +page.server.ts
├── new/+page.svelte
└── [slug]/
    ├── +page.svelte
    └── +page.server.ts

src/routes/pages/[slug]/
├── +page.server.ts
└── +page.svelte

src/routes/api/builder/
├── pages/+server.ts
├── pages/[slug]/+server.ts
└── publish/+server.ts

src/routes/auth/
├── login/+server.ts
├── callback/+server.ts
└── logout/+server.ts

src/lib/server/auth/
├── github.ts
├── session.ts
└── index.ts

src/hooks.server.ts

content/
├── pages/*.json
├── _drafts/
└── _templates/
```

## Dependencies

| Package | Size | Phase | Status |
|---------|------|-------|--------|
| `nanoid` | ~130B | 1 | ✅ Installed |
| `@types/node` | dev | 1 | ✅ Installed |
| `arctic` | ~15KB | 5 | ✅ Installed |
