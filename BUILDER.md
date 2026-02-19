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

### Phase 4: Live Preview

**Status: TODO**

Wire reactive updates between editor state and the canvas.

#### Deliverables

- **Reactive canvas**: modifying props in the property panel instantly updates the preview
- **Edit/Interact toggle**: `pointer-events: none` on components in edit mode, `pointer-events: auto` in interact mode
- **Responsive preview**: CSS zoom for mobile/tablet/desktop breakpoints
- **Inline text editing**: double-click a `_text` block to edit content directly

---

### Phase 5: Storage + Auth

**Status: TODO**

Persist pages and protect the editor.

#### Deliverables

- **PageStorage interface** (`src/lib/builder/storage/types.ts`)
  - `list()`, `get(slug)`, `save(page)`, `delete(slug)`, `publish(slug)`
- **Local filesystem implementation** (`storage/local.ts`)
  - API routes: `POST /api/builder/pages`, `GET/PUT/DELETE /api/builder/pages/[slug]`
  - Publish: `POST /api/builder/publish` (git add + commit + push)
- **IndexedDB drafts** (`storage/draft-store.ts`)
  - Auto-save every 5s to IndexedDB (client-side)
  - Recover unsaved changes on reload
- **Dashboard** (`/builder` page)
  - List all pages with status, last modified, actions
  - Create new page, duplicate, delete
- **GitHub OAuth** authentication
  - Login flow via `arctic` library
  - `hooks.server.ts` middleware protecting `/builder/**` and `/api/builder/**`
  - Session in httpOnly cookie
  - Whitelist of authorized GitHub usernames

#### Dependencies

| Package | Size | Usage |
|---------|------|-------|
| `arctic` | ~15KB | GitHub OAuth |
| `idb` (optional) | ~1.2KB | Typed IndexedDB wrapper |

#### Files

```
src/lib/builder/storage/
├── types.ts                              # PageStorage interface
├── local.ts                              # Filesystem implementation
├── github.ts                             # GitHub API implementation (later)
└── draft-store.ts                        # IndexedDB auto-save

src/routes/api/builder/
├── pages/+server.ts                      # GET (list), POST (create)
├── pages/[slug]/+server.ts               # GET, PUT, DELETE
└── publish/+server.ts                    # POST (git commit + push)

src/hooks.server.ts                       # Auth middleware
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
│   ├── local.ts
│   ├── github.ts
│   └── draft-store.ts
└── utils/
    ├── id.ts
    ├── tree.ts
    ├── validation.ts
    ├── shortcuts.ts
    └── index.ts

src/routes/builder/
├── +layout.svelte
├── +page.svelte
├── [slug]/+page.svelte
└── preview/+page.svelte

src/routes/pages/[slug]/
├── +page.server.ts
└── +page.svelte

src/routes/api/builder/
├── pages/+server.ts
├── pages/[slug]/+server.ts
└── publish/+server.ts

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
| `arctic` | ~15KB | 5 | Pending |
| `idb` | ~1.2KB | 5 | Pending (optional) |
