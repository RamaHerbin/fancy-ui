# Changelog

## 0.10.0

### Minor Changes

- 09b0f81: Add the agent-activity and structured-output surfaces of the AI/chat family: `AgentPlan` (glanceable checklist with done/total count, completion bar, status glyphs, and one level of substeps), `SubagentList` (fan-out panel for parallel workers with per-row status dots, model badges, and progress bars under a self-deriving label), `ApprovalCard` (human-in-the-loop gate whose approve/deny footer swaps for a politely announced verdict line, with a destructive variant), `RecommendationCard` (an agent's proposal with a counted-up confidence figure beside a filling ring, banded by certainty), `ArtifactCard` (a generated document as a tangible object — version navigator, streaming preview behind a fade, and a real Open button), and `AiDataTable` (compact comparison table for structured model output with real table semantics, keyboard-scrollable overflow, and no client-side sorting by design). All six render duplicate model-supplied ids without crashing, follow the shared `--ft-status-*` tokens, and ship with colocated tests, docs examples, and stories.
- de5f712: Add the knowledge surfaces of the AI/chat family: the `Sources` compound (`Sources`, `SourcesTrigger`, `SourcesList`, `SourceCard`, plus the exported `SOURCES_CONTEXT_KEY`/`SourcesContext` contract) rendering an answer's citations as a monogram-stack pill that expands into scannable source cards; `InlineCitation` (a numbered in-sentence reference revealing a `SourceCard` preview in a floating card on hover or focus, tooltip-pattern accessible); `WebSearch` (a search the agent ran — query header, indeterminate scanning bar, results landing row by row without re-keying settled entries); and `ImageGeneration` (a fixed-aspect frame that holds layout while a model draws — pixel-grid generating state, blur-to-sharp reveal that can never strand a server-rendered image blurred, and an error state with retry). Shared host/monogram helpers land in the internals layer used across the three citation-bearing components.
- d3d1261: Add the input layer of the AI/chat family: the `Composer` compound — a root that owns the draft plus seven parts reading it through a shared context (`ComposerInput` with auto-grow and Enter/Shift+Enter, `ComposerSubmit` that becomes a stop button while streaming, `ComposerToolbar`, `ComposerModelPicker`, `ComposerAttachments`/`ComposerAttachment` chips with upload progress, and `ComposerCommandMenu`, one caret-anchored completion primitive mountable twice for slash commands and @ mentions, with a single source of truth for trigger-token arithmetic) — alongside `VoiceInput` (a mic button opening into a canvas waveform panel fed by consumer-supplied amplitude levels, never touching the microphone itself) and `ContextRing` (context-window usage as a compact donut with warn/critical bands and an optional breakdown popover). The internals `float` action now goes out of flow before measuring its anchor, fixing sibling-anchored popover placement everywhere it is used.
- af9ee05: Add the shared foundations for an upcoming AI/chat component family. A new dependency-free, SSR-safe `_internals` module set ships inside the package: a hardened markdown mini-renderer (token-tree rendering with zero raw-HTML sinks, allowlisted link schemes, and linear-time parsing under adversarial input, with a dedicated security regression suite), a streaming-text primitive that animates appended deltas then settles, a unified-diff parser, floating-menu positioning with viewport flip/clamp, a chat autoscroll action with stick-to-bottom detection, elapsed/relative time helpers, copy-to-clipboard state, and a waveform draw core. Shared AI data types (`ChatMessageData`, `ToolCallData`, `SourceData`, `PlanStepData`, `ThreadData`, …) are exported from the package barrel, and two new registry categories (`ai-chat`, `ai-agents`) land with labels translated across all 16 docs locales.
- 9eb4cf6: Add the message surfaces of the AI/chat family: the `ChatMessage` compound (`ChatMessage`, `ChatMessageActions`, `ChatMessageAction`, `ChatMessageBranches`, plus its context contract) rendering one conversation turn aligned and dressed by its role — streaming body via the growing-string contract, hover-revealed action rail with confirm-state buttons, and a keyboard-accessible response-version navigator — alongside `PromptSuggestions` (staggered prompt pills that cascade in after a reply and replay on re-show) and `ChatError` (quiet inline failure banner with a self-disabling retry). All SSR-safe, reduced-motion aware, themable via `--ft-*` hooks, with colocated tests, docs examples, and stories.
- ff29f18: Add the first five AI/chat components: `PixelLoader` (pixel-matrix pre-token loading state with a deterministic diagonal wave), `TypingIndicator` (staggered three-dot presence indicator), `ThinkingIndicator` (live agent status with shimmering activity label and elapsed stopwatch, inline or pill variant, with a `done` snippet), `StreamingText` (renders a growing string as a live token stream — appended deltas land tinted and settle, optional block cursor and markdown mode), and `ReasoningPanel` (collapsible reasoning trace that streams, autoscrolls, and folds itself into a "Thought for Ns" summary once done). All five are SSR-safe, honor `prefers-reduced-motion`, expose `--ft-*` theming hooks, and ship with colocated tests, docs examples, and stories.
- 546bfe2: Complete the AI/chat family with its thread layer: `ScrollAnchor` (a scroll region that pins to its last line while content streams, releases when the reader scrolls up, and floats a "Jump to latest" pill that respects reduced motion and hands focus back), `ThreadList` (conversation history with unread dots, one shared relative-time clock for the whole list, selection, and per-row delete as a true sibling control), and `ChatPanel` with `ChatEmptyState` (the conversation shell — sticky header and composer rows around a transcript that opens at its latest turn and tracks content growth without scroll events). The internals autoscroll action now re-reads its container on reconnect, and list keys across the family are identity-stable under both duplicates and reorders. The docs gain a Full Conversation capstone demo composing fourteen components of the family end to end, social cards for all twenty-eight new components, and updated component counts.
- 7469197: Add the tool-use surfaces of the AI/chat family: `ToolCall` (one invocation in a disclosure card — status dot, duration, pretty-printed request/result with cycle-safe JSON rendering, error calls auto-open), `ToolTimeline` (compact session summary on a vertical rail with verbs, targets, diff stats, and relative timestamps), `TerminalBlock` (live append-only command transcript with a hand-rolled ANSI SGR subset, stick-to-bottom autoscroll, running cursor, and exit-status footer), and `CodeDiff` (unified diff tuned for chat width — foldable per-file cards, tinted add/delete rows, copy-safe gutters, soft line clamping — driven by the internal diff parser). Introduces the shared `--ft-status-*` color tokens with `light-dark()` fallbacks used across the family for run-status semantics.
- 2c62338: First Core primitives: the Actions group. `Button` (six variants, three sizes, a
  loading state, and a polymorphic anchor mode), `IconButton`, `ButtonGroup`,
  `Link`, `Toggle`, `ToggleGroup` and `CopyButton`.

  These are the first components that dress themselves entirely in the theme's
  semantic tokens rather than fixed colours, so they follow the light/dark switch,
  the theme generator and the docs skins without per-skin overrides. The one colour
  with no semantic token — the brand accent used by the accent variant and the
  focus ring — resolves through `--ft-accent`, with a `light-dark()` fallback, and
  can be retuned from anywhere up the tree.

- 0838144: Core form primitives: `FormField`, `Label`, `Input`, `Textarea`, `Checkbox`,
  `RadioGroup`, `Switch`, `Slider` and `NumberInput`.

  `FormField` owns the wiring these controls otherwise make every caller repeat.
  It generates the control's id, tracks which of the help and error text are
  actually rendered, and publishes `aria-describedby`, `aria-invalid`, `required`
  and `disabled` through context — so a control inside one needs no manual id
  plumbing, and the same control outside one still works from its own props.

  Every control is built on its native element rather than a restyled `div`, so
  the browser supplies focus, keyboard behaviour and form submission: `RadioGroup`
  inherits the platform's own roving tab stop from a shared `name`, and `Slider`
  delegates its entire keyboard model to `input[type=range]`.

  The context carries two labelling ids rather than one. A control whose root is a
  labelable element is labelled through `controlId` and `<label for>`; a control
  whose root is not — `RadioGroup`'s `div[role=radiogroup]` — points
  `aria-labelledby` at `labelId` instead. `<label for>` only associates with
  button, input, meter, output, progress, select and textarea, and an ARIA role
  does not extend that list, so the group had no accessible name until this split
  existed.

- 7fa1ad0: The Core form controls that open a floating surface: `Select`, `Combobox`,
  `Autocomplete`, `SearchInput`, `PasswordInput`, `FileUpload`, `DatePicker` and
  `TimePicker`, plus `_internals/listbox`.

  The listbox core gets two behaviours right once for the four components that
  navigate a list, rather than four times: a run of consecutive disabled options is
  skipped as a block, terminating rather than looping when every option is
  disabled; and typeahead accumulates within a short window, with a repeated
  character cycling through its matches the way a native select does.

  `Combobox` and `Autocomplete` look alike and are not. `Combobox` is a closed set —
  the value must be one of the options, and blur, Escape and outside click all
  revert to the last valid selection. `Autocomplete` is an open field where any
  text is valid, so arrowing only highlights rows and never writes into the input,
  leaving Escape nothing to restore.

  `DatePicker` builds on the calendar core rather than reimplementing month
  arithmetic, keeps every date in local time end to end so no timestamp round trip
  can shift the day, and derives every day cell's accessible name from `Intl` with
  the caller's locale — a hardcoded month table is a bug in a library whose docs
  ship sixteen languages. `TimePicker`'s value is always `"HH:mm"` in 24-hour form;
  `hour12` changes the display only.

  `FileUpload` validates `accept`, `maxSize` and `maxFiles` itself, because a
  dropped file never passes through the input's own filter. Every rejection —
  including files past the first on a single-file drop — is announced rather than
  silently discarded.

- 9620c97: Groundwork for the upcoming Core component family: every component now carries a
  `group` ("core" | "fancy") in its registry metadata, the category union gains
  `actions`, `forms`, `overlays` and `display`, and shared internal utilities
  (portal, focus trap, dismissable layers, anchor positioning, calendar core, ids)
  land under `_internals` for the primitives to build on. The docs sidebar and
  gallery now group and filter components by Core/Fancy.
- bb52fc2: The Core navigation family: `Navbar`, `Sidebar`, `Tabs`, `Breadcrumb`, `Pagination`,
  `Stepper`, `DropdownMenu`, `ContextMenu`, `CommandMenu` and `NavigationMenu`, plus
  `_internals/menu`.

  `NavigationMenu` is deliberately not a menu. `role="menu"` describes an application menu of
  commands, and marking site navigation that way makes assistive technology announce a
  command menu that behaves nothing like one — so it implements the disclosure-navigation
  pattern instead: a `<nav>` of buttons carrying `aria-expanded` and `aria-controls`. The
  menus that genuinely are menus — `DropdownMenu` and `ContextMenu` — share one
  implementation of their items, keyboard handling and submenus rather than carrying two
  copies that drift, and move real DOM focus rather than pointing at rows with
  `aria-activedescendant`, because that is what `role="menu"` promises a screen reader.

  `_internals/menu` gets three behaviours right once for every menu surface: items navigate
  in document order rather than the order they happened to register, which diverge whenever a
  conditional block or a reordering list is involved; a run of disabled items is skipped as a
  block, terminating rather than spinning when every item is disabled; and typeahead matches
  an item's _visible_ text, excluding `aria-hidden` icons and shortcut hints, so pressing "r"
  finds a row labelled "Rename" that renders a decorative glyph before it.

  `CommandMenu` keeps focus in its input and highlights the matched substring by splitting the
  label into rendered segments — never `{@html}` — locating the match in the original label
  rather than the accent-folded one, since stripping combining marks shifts every index after
  them.

  `Breadcrumb` will not collapse the current page: `itemsAfterCollapse` has a floor of 1,
  because a breadcrumb whose last item is hidden is a navigation landmark that no longer says
  where you are. `Pagination` derives its page window from a pure, separately tested function
  and floors its inputs, so a `count` computed by division rather than `Math.ceil` cannot
  silently drop pages.

  Every component here dresses in the theme's semantic tokens, so light mode, the theme
  generator and the skins all keep working; the brand accent sits behind `--ft-nav-accent`,
  declared with its fallback on each element that reads it — including every portalled panel,
  which inherits nothing from the component it belongs to.

- 19d0996: Core overlay primitives: `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`,
  `Tooltip`, `HoverCard` and a `Toast` system, plus `_internals/scroll-lock`.

  Scroll locking is reference-counted, so nesting an overlay inside another and
  closing the inner one leaves the page locked; it restores the scroll position
  exactly and compensates for the scrollbar gutter so nothing shifts sideways.
  Dismissal runs through the existing layer stack, so one Escape closes one
  layer — including `Tooltip`, which now participates in that stack rather than
  carrying its own listener.

  `AlertDialog` deliberately cannot be dismissed by clicking outside it, with no
  prop to re-enable that: a destructive confirmation a user can dismiss by missing
  is not a confirmation. Escape does close it, routed through the same cancel path
  as the Cancel button, so a keyboard gesture can never become a path to Confirm.
  Cancel is focused first.

  Every surface that opens must be reachable by keyboard, so `Tooltip` and
  `HoverCard` open on focus and not only on hover, and `Tooltip` warns in
  development when its trigger is not focusable rather than failing silently.
  `Toast` announces through live regions that exist from mount and only change
  content, with `assertive` reserved for errors, and pauses its auto-dismiss on
  hover or focus for every toast rather than only actionable ones.

- 81a3487: FluidCursor: experimental bitmap dithering mode. The new `dither` prop renders the fluid as a retro ordered-dither bitmap — dye is snapped to a chunky pixel grid and each color channel is quantized against a procedural 4x4 Bayer matrix, so dot density encodes brightness while hues are preserved. Tune with `ditherPixelSize` (CSS px per dot, default 3) and `ditherLevels` (color levels per channel, default 4). Dither forces the WebGL renderer; `hdr` is ignored while it is set.

### Patch Changes

- 3ed945b: New brand mark: a four-pointed sparkle running pink through violet to cyan under
  an emissive rim, replacing the five floating circles.

  `static/favicon.svg` holds the geometry, so every generated raster — favicon,
  touch icon, PWA icons, the social card and all 106 per-component cards — now
  carries it. A site-side `Logo.svelte` renders the same mark inline with `size`,
  `glow` and `animated` props, unique per-instance gradient ids so several can
  share a page, and a twinkle that stands down under `prefers-reduced-motion`. It
  sits beside the wordmark in the landing header, the landing footer and the docs
  sidebar; the retro-os skin keeps its own pixel logo.

  The brand-asset script gained the `pnpm build:brand-assets` entry its own
  docstring already advertised, reads the component count off the registry instead
  of a hardcoded number that had drifted to 61, and emits the README raster.

- f9964ea: Add the Cameleon Engine — a multi-skin UI system where the same headless component API (Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Badge, Tooltip) renders in radically different art directions ("skins": Brutal, Glass, Terminal), driven by a `<FancyProvider skin={...}>` context provider, scoped design tokens, and per-skin recipes. Includes a `/skins` documentation page that reproduces a full design-system layout (color tokens, type scale, grid, components, responsive, and a 10-control × 6-state matrix) and re-skins the whole page live. Docs-site only — the engine lives under `src/lib/cameleon/` and is not part of the published component surface.
- f9964ea: Docs: add a Brutal skin switcher to the documentation header — toggles the whole docs site to the Cameleon Brutal art direction (paper palette, ink borders, hard shadows, Archivo/Space Mono, light code blocks).
- f9964ea: docs(skins): calibrate the Brutal and Retro OS docs skins to their reference art direction — window-frame desktop layout, explorer window and taskbar for Retro OS; paper chrome, rail cards and dark code surfaces for Brutal; docs-site only, no component API changes
- 25014c4: The landing page is rebuilt as a bordered live-specimen grid: one fixed
  technical-editorial art direction — near-black canvas, ivory ink, a single
  violet accent, hairline borders drawing the page as a measured frame. Every
  showcased demo is the real library component running live: the fluid cursor
  as panel 01 beside the hero copy, a signature row with the image-trail
  cursor, LiquidGlass and the rainbow button, and a closing row of form
  primitives (Input, Select, Slider, Switch, Tabs) exactly as they ship.

  Adds a fifth skin to the cameleon engine, `aurora` — the library's own
  near-black canvas and violet→blue sweep. It implements the full twelve-token
  contract and all ten recipes, so it stands alongside brutal, glass, terminal
  and retro-os on the `/skins` page.

## 0.9.1

### Patch Changes

- d81ae56: FireworksHdr: new component — a GPU fireworks engine that renders shells into an HDR accumulation buffer, with a WebGPU path (float16 + display-p3 + extended tone mapping) and a WebGL2 fallback that resolves to display-p3 or plain sRGB. Ambient shells schedule themselves on a Poisson cadence inside weighted zones, avoid a caller-supplied keep-clear rect, and adapt their render scale and spawn density to the measured frame time; `prefers-reduced-motion` turns the scheduler off while imperative launches keep working. The `onReady` callback hands over a `FireworksHandle` (`launch`, `setAmbient`, `setKeepClear`, `setExposure`, `renderLevel`, `cleanup`) and an `onLost` callback reports a GPU context loss that could not be recovered. `FireworksHdr`, `FireworksHdrProps`, `FireworksHandle`, `LaunchOptions`, `LaunchResult`, `FireworksRenderLevel`, `ShellKind` and `QualityTier` are exported from the package root.
- 5ad8082: FireworksHdr: pattern shells. `shell: "heart"` and `shell: "star"` break into a figure instead of a sphere, and `shell: "shape"` draws any closed outline passed as `shapePoints` (y-up points around the origin, any scale — the outline is normalized and redrawn at the shell's radius, walking its edges so a hand-written polygon works as well as a sampled curve). The burst is cut from the outline: each spark's speed is proportional to its sample's distance from the centre, so linear drag coasts the figure into shape in the sky before it droops. Pattern shells suppress the break asymmetry, the stragglers and most embers, which exist to make a peony look natural but read as a broken figure on a heart. A new `ambientShells` prop restricts the ambient scheduler to a chosen set of shells, pattern shells included. The outline helpers (`heartOutline`, `starOutline`, `polygonOutline`, `outlineBurst`) are exported for building your own figures, and a `shape` shell launched without points falls back to a plain sphere rather than vanishing.
- e65e029: FireworksHdr: retune the look so a shell reads as a firework. The particle quad is now oversized with the gaussian windowed to zero at its edge — an unwindowed halo still carried ~7% of its peak where the geometry stopped, and additive blending drew that step as a hard-edged square around every flash. Debris gravity drops to a fraction of the rocket's (a spark's terminal velocity was several times the burst's own expansion speed, so shells collapsed into downward fountains instead of opening), burst speed rises to match the drag, and each spark draws its own drag so the debris no longer falls as a parallel curtain. Sparks hand over from the magnesium white to the shell hue by a third of their life instead of three quarters, the detonation flash is smaller and decays faster, the accumulation trail and per-instance velocity stretch are shorter, ascent trails scatter laterally, rockets carry a slight positional wobble, and 6% of a shell's sparks crackle at 24 Hz (documented in the spec, previously never wired). No API change.

## 0.9.0

### Minor Changes

- 0b1d2d8: FluidCursor: new optional `onReady` callback handing the parent an imperative handle to drive the simulation programmatically — `moveTo(x, y, color?)` traces a path with a synthetic pointer, `penUp()` ends a stroke without a connecting streak, `burst(x, y, dx, dy, color)` fires a one-off impulse — plus a `renderLevel` readback (`"webgpu-hdr" | "webgpu-sdr" | "webgl-p3" | "webgl-sdr" | "none"`) so callers can tell true HDR output from a clamped fallback. `webgpu-hdr` requires both extended tone mapping and a display reporting `(dynamic-range: high)`; when no renderer comes up at all the callback receives an inert handle reporting `"none"`. The new `FluidCursorHandle` and `FluidRenderLevel` types are exported from the package root. Behavior is unchanged when `onReady` is omitted.

### Patch Changes

- 16532ad: Landing page: rebuild the marketing page from the design system — a sticky header, a hero with gradient type over the HDR FluidCursor simulation, a feature-chip row, a component showcase, a component index strip, an interactive install section (package-manager tabs with copy-to-clipboard), a detailed "See FancyUI in action." gallery with three full app previews, and a values strip. The page is now composed of focused section components under `src/lib/components/landing/` instead of one long route file, and every navigation target points at a route that exists. Docs-site only — no change to the published component API.
- 0e75f8d: Docs site launch readiness: server-rendered pages with full SEO metadata (canonical, Open Graph and Twitter tags, sitemap, web manifest, favicons), a styled error page, corrected component counts and links, and expanded README and component documentation. No changes to the published component API.
- ddd70b8: Landing: the footer's synthwave visual is now a single panoramic backdrop image that bleeds softly under the adjacent cards and footer links, replacing the previous multi-layer composition. Flatter, wider section with art-directed responsive crops. Docs-site only — no change to the published component API.
- fdfc8b7: Docs: replace the README open-source program badge with the official wordmark lockup (vector outlines, dark-mode aware). Docs-only — no change to the published component API.
- 3717993: Docs site: stronger search referencing — structured data (WebSite, SoftwareApplication, BreadcrumbList, TechArticle, ItemList), keyword-rich component page titles, server-rendered example content and code panes, breadcrumb, related-components and previous/next navigation, per-component social cards, and richer gallery copy. No changes to the published component API.

## 0.8.0

### Minor Changes

- 2cd6cc7: FluidCursor HDR mode: new `hdr` and `hdrBoost` props. When enabled, the simulation renders through a new WebGPU engine (WGSL port of the fluid solver) into an `rgba16float` / `display-p3` canvas with extended tone mapping — colors glow brighter than SDR white on HDR displays. Falls back automatically to the existing WebGL renderer (with a wide-gamut P3 backbuffer where supported), and rendering with `hdr` disabled is unchanged.

  Also: in `contained` mode the splat radius now auto-scales to viewport-equivalent size (capped at ~30% of the container height), so the effect no longer looks tiny inside small containers such as docs demos. Fullscreen and viewport-sized containers are unaffected.

- 38eaa22: LiquidGlass: add an automatic Safari fallback — WebKit cannot resolve SVG url() filter references inside backdrop-filter, so the chromatic displacement silently disappeared there. On Safari the component now renders a plain frosted blur instead, tunable via the new optional props `fallbackBlur` (default 20) and `fallbackSaturation` (default 180), mirroring FrostedGlass. Docs: both glass components' preview now showcases the landing-page navbar example.
- 37554b2: Add LiquidText component: big text that liquefies along the cursor's path via a raw-WebGL fluid solver, with chromatic-aberration fringing that relaxes back over time. Falls back to static styled text under reduced-motion, missing WebGL, or narrow viewports.

### Patch Changes

- 8771355: Docs: the Changelog page now renders straight from the repository's CHANGELOG.md, so it can never fall behind a release again, with translated page chrome in all 16 locales. The per-locale prose-page mechanism this replaces is removed along with its 48 localized files.
- 8771355: Docs: lock the localization system down — a CI parity gate (`pnpm check:i18n`) plus compile-time key checking (`satisfies Catalog`) across all 16 catalogs, typed `tCategory()`/`docTitle()` helpers replacing five unchecked casts and six hand-built title strings, and translated category/status badges in the component gallery (they were stuck in English next to translated headings).
- c5ff67a: Docs: redesign the getting-started Introduction page — a structured layout with a feature-pill row, a Philosophy card grid, a numbered Quick Start (install / import / use), a What's Included category grid, Next Steps links, and a Theme Generator call-to-action. Theme-aware (adapts to light/dark and the theme switcher) and wired through the i18n store. Docs-site only; no change to the published component API.
- 66e10d1: Docs & landing: live GitHub star count next to the GitHub links (fetched client-side, cached for 1h, hidden when the API is unreachable).
- 46737d9: Docs: the Installation page is redesigned as a first-class component (numbered install steps, prerequisite cards, anchored sections) following the docs design language, with all 16 locales translated via the message system.
- 5a0e389: Docs: add the Claude Code Open Source Program badge to the README.
- 3c404d5: fix(docs Sidebar): keep the sidebar docked on desktop under RTL locales

  Under RTL locales (`ar`, `fa`) the docs sidebar was pushed off-screen on desktop (`lg`+), leaving an empty `ps-64` gutter and no navigation. The desktop docking utility `lg:translate-x-0` and the mobile-drawer RTL transform `rtl:translate-x-full` compile to equal-specificity rules, so source order decides — and `rtl:translate-x-full` is emitted later, winning on RTL desktop. Adding an RTL-aware desktop override (`rtl:lg:translate-x-0`) restores the docked sidebar (mirrored to the right) while leaving the mobile drawer behaviour unchanged. Docs-site only — no change to the published component API.

- 8771355: Docs: the Theming page is redesigned as a first-class component (token pills, Theme Generator callout, anchored sections for every token group) following the docs design language, with all 16 locales translated via the message system.

## 0.7.0

### Minor Changes

- 8eb3ae6: feat: add FrostedGlass component — turbulence-noise glass refraction (alternative to LiquidGlass)
- b420f1c: Add multi-language support to the docs site: a language switcher in the header with 16 locales (en, fr, es, de, it, pt, pl, cs, ja, ko, zh-Hans, hi, id, tr, ar, fa), including full RTL layout for Arabic and Persian. UI chrome and the getting-started guides are translated (machine-translated drafts pending native review); the component registry stays English as the machine-facing source. Docs-site only — no change to the published component API.
- 7ed0256: Add a swatch-dropdown theme switcher to the docs header to pick from named themes (Light, Dark, Cupcake, Emerald, Corporate, Retro, Cyberpunk, Synthwave, Dracula, Forest, Sunset, Ocean, Mono) plus System. Each theme applies site-wide via CSS-variable overrides, persists in localStorage, and toggles light/dark. Docs-site only — no change to the published component API.

### Patch Changes

- 8362a2b: Fix the Component Copilot system prompt: it taught the wrong install command (`pnpm add fancy-ui` / `import … from 'fancy-ui'`) instead of the real package `fancy-ui-svelte`, and a hardcoded "60+ components" that had drifted from the registry. The count is now derived from the registry so it never drifts again, and the prompt now documents the required `@import "fancy-ui-svelte/tailwind.css";` stylesheet line without which Tailwind generates none of the component classes. Docs-site only — no change to the published component API.
- d6a3f89: fix(pkg): ship `dist/utils` in the published package

  The `files` array listed the file `dist/utils.js` but not the `dist/utils/` directory, so `dist/utils/animation.js` (and `color.js`/`geometry.js`) were never published. Any consumer importing from the barrel pulled in `NoiseReveal`, whose `import ... from "../../utils/animation.js"` then failed to resolve at bundle time, breaking the consumer's build. Adding `dist/utils` to `files` restores the missing directory.

- 57f0650: chore: add Storybook 10 with SvelteKit integration for component development and documentation
- 724f108: Add an interactive Theme Generator page to the docs — tune OKLCh color, radius, motion, and rainbow-palette tokens with live sliders, preview components re-theme in real time, and copy the generated CSS.

## 0.6.0

### Minor Changes

- 6ede21f: Add NoiseReveal component: WebGL image reveal with a Perlin-noise dissolve mask, contracting radial gradient, and wave displacement, inspired by a Codrops shader effect
- 8be8831: Add LineReveal and EditorialEngine components powered by @chenglou/pretext:
  LineReveal staggers a line-by-line text reveal with lines computed by canvas
  text measurement instead of DOM splitting; EditorialEngine renders a live
  magazine layout (multi-column flow with cursor handoff, auto-fitted headline,
  drop cap, pullquotes) where text reflows in real time around draggable orbs
  with zero DOM reads.

### Patch Changes

- d17b72b: docs: clarify release pipeline and fix branch name in CONTRIBUTING.md
- 9410c20: Fix bundle correctness and tighten the dependency surface:
  - Export `Dock` (and `DockIcon`, `DockSeparator`) from the package entrypoint — the component was registered and shipped under `dist/`, but never re-exported, making it unreachable from `import { Dock } from "fancy-ui-svelte"`.
  - Remove the dead `fluid-cursor-advanced` registry entry left over from the merge into `FluidCursor` — the component folder no longer exists, so the registry was advertising a non-shippable slug.
  - Move `@vercel/analytics` from `dependencies` to `devDependencies` — it's only used by the docs site (`src/routes/+layout.svelte`) and was unnecessarily pulled into consumer installs.
  - Drop the no-op `rewriteRelativeImportExtensions` flag from `tsconfig.json` — it has no effect with `moduleResolution: bundler` + SvelteKit's build pipeline.
  - Fix README component count: `52`/`57` → `56`.
  - Add `pnpm check:registry` (and run it in CI) — parses `src/lib/fancy-ui/registry.ts`, `src/lib/fancy-ui/index.ts`, and the component folders, and fails if they drift. Catches both quoted (`"book": { ... }`) and bare-identifier (`book: { ... }`) registry keys.

- 8bdd475: Add llms.txt and llms-full.txt endpoints serving LLM-friendly documentation generated from the component registry

## 0.5.0

### Minor Changes

- 972b799: refactor(fluid-cursor): merge FluidCursorAdvanced into FluidCursor with new `contained` prop

- f3f5f7d: feat(fluid-cursor-advanced): add singleton instance management with `allowMultiple` prop
- dec71f5: feat(docs): merge demo examples into doc pages
- ccab02c: Add neon synthwave glow effect to landing page code blocks

### Patch Changes

- 2e31372: chore: replace landing page with new design

## 0.4.1

### Patch Changes

- dee3bce: fix(confetti): rename manualstart prop to manualStart
- f94d734: Add interaction and autonomous animation props to FluidCursorAdvanced: `interactive`, `autoSplat`, `autoSplatInterval`, `pauseWhenHidden`, `splatOnMount`
- 945cf3f: Add FluidCursorAdvanced component that confines the WebGL fluid simulation to a parent container element
- 39803f1: add fluidColor, fluidColors, colorIntensity props and hex backColor support to FluidCursor
- 47d6f0d: add new root exports (FluidCursor, InteractiveGridPattern) and remove hardcoded `tracking-wider` from NumberTicker

## 0.4.0

### Minor Changes

- e1d3641: add Component Copilot AI chat demo at /demo/component-copilot
- c81e5f6: add MatrixRain and TerminalText components with interactive demo

## 0.3.0

### Minor Changes

- f40190a: feat(displacement-text): add 3D displacement text component
- 649870d: Add interactive props playground to demo pages

### Patch Changes

- f40190a: feat: add AppleCardCarousel component — horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App Store UI
- f40190a: fix compare corner overflow and broken animated-tooltip image
- f40190a: docs: update homepage quick start and roadmap for npm package release
- f40190a: fix(flip-words): prevent layout shift during word transition
- f40190a: feat: add LineHoverLink component — link with 11 animated underline hover effects, pure CSS
- f40190a: add npm package build pipeline — consumers can now install via `npm install fancy-ui`
- 265a76b: docs: mark v0.2 as released and update v0.3 roadmap status

## 0.2.1

### Patch Changes

- cb441e1: feat: add AppleCardCarousel component — horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App Store UI
- de83ffd: feat(displacement-text): add 3D displacement text component
- 76bfff4: feat: add LineHoverLink component — link with 11 animated underline hover effects, pure CSS
- db6f88e: add npm package build pipeline — consumers can now install via `npm install fancy-ui`

## 0.2.0

### Minor Changes

- 6e66ac4: Add AnimatedTestimonials component — testimonial carousel with smooth slide animations, direction-aware navigation arrows, and optional autoplay support.

### Patch Changes

- 5cc87d8: Set up changesets versioning workflow

All notable changes to fancy-ui will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note on 0.x versioning:** While the version is below 1.0.0, minor releases may
> include breaking changes. See the [versioning policy](https://github.com/RamaHerbin/fancy-ui/blob/main/CONTRIBUTING.md#versioning) for details.

---

## 0.1.0 — 2026-03-13

Initial public release — 50 components across 10 categories, built with Svelte 5 runes
and Tailwind CSS v4.

### Added

#### Buttons (5)

| Component              | Description                                   |
| ---------------------- | --------------------------------------------- |
| GradientButton         | Rotating conic-gradient rainbow border effect |
| InteractiveHoverButton | Hover effect revealing alternate content      |
| RainbowButton          | Animated rainbow gradient border effect       |
| RippleButton           | Click ripple effect                           |
| ShimmerButton          | Rotating conic-gradient shimmer border effect |

#### Cards (8)

| Component           | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| BentoGrid           | Bento-style grid layout with slot-based and props-based card variants        |
| Book                | 3D book component with cover, spine, and back face that opens on hover       |
| Card3D              | Interactive 3D perspective card with depth effects on child elements         |
| CardSpotlight       | Card with mouse-following radial gradient spotlight overlay                  |
| DirectionAwareHover | Image card with overlay that slides in from the mouse entry direction        |
| FlipCard            | Card that flips to reveal back content on hover using CSS 3D transforms      |
| GlareCard           | Holographic trading card effect with mouse-tracking glare and rainbow foil   |
| TextRevealCard      | Card that reveals text on horizontal mouse drag with animated star particles |

#### Text & Typography (12)

| Component          | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| BlurReveal         | Scroll-triggered blur-to-clear reveal animation with staggered children        |
| BoxReveal          | Content reveal with sliding colored box animation                              |
| ColourfulText      | Per-character color animation with shuffling colors                            |
| ContainerTextFlip  | Text container that cycles through words with per-character blur animation     |
| FlipWords          | Cycling word animation with per-letter fade-in and blur effects                |
| Focus              | Text component that cycles focus through words with blur and corner frame      |
| HyperText          | Character scramble effect that activates on hover                              |
| LetterPullup       | Staggered letter pull-up animation with wave entrance effect                   |
| LineShadowText     | Text with animated diagonal line shadow pattern that scrolls continuously      |
| NumberTicker       | Animated number counter with easing, triggered on viewport entry               |
| SparklesText       | Text with animated SVG sparkle stars overlay                                   |
| TextGenerateEffect | Typewriter-style text reveal that fades in words one by one with optional blur |

#### Backgrounds (4)

| Component       | Description                                                                        |
| --------------- | ---------------------------------------------------------------------------------- |
| FallingStarsBg  | Canvas-based 3D starfield with perspective projection, motion trails, and glow     |
| FlickeringGrid  | Canvas-based grid of squares with flickering opacity                               |
| Sparkles        | Canvas-based floating particle sparkle effect with configurable density and colors |
| StarsBackground | Animated starfield background with parallax mouse tracking                         |

#### Effects (14)

| Component              | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| AnimatedBeam           | Animated SVG beams connecting elements with smooth gradients                       |
| BorderBeam             | Animated beam effect that travels around borders                                   |
| Confetti               | Confetti celebration effect powered by canvas-confetti with button trigger support |
| FluidCursor            | WebGL fluid simulation that follows cursor movement                                |
| GlowBorder             | Animated glowing border effect with gradient support                               |
| GlowingEffect          | Mouse-proximity based glowing border effect with animated conic gradient           |
| ImageTrailCursor       | Cursor-following image trail with 8 animation variants                             |
| InteractiveGridPattern | SVG grid of squares that highlight on hover with smooth fade transitions           |
| LiquidGlass            | Glass-like visual effect using SVG filters for chromatic displacement              |
| Meteors                | Animated meteor shower effect with randomized positions and delays                 |
| NeonBorder             | Dual-color neon glow border effect with optional rotation animation                |
| Ripple                 | Concentric pulsing circles with ripple wave animation                              |
| SmoothCursor           | Physics-based smooth cursor with spring animations and rotation effects            |
| TracingBeam            | Vertical SVG beam that highlights scroll progress alongside content                |

#### Layout (2)

| Component       | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| ContainerScroll | Scroll-driven animation that rotates and scales a card from tilted to flat |
| Marquee         | Infinite scrolling component for text, images, or cards                    |

#### Navigation (2)

| Component | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| Dock      | macOS-style dock with icon magnification on hover                    |
| Timeline  | Vertical timeline with scroll-driven progress line and sticky labels |

#### Data Display (1)

| Component | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| LogoCloud | Logo display with animated marquee, static grid, and icon variants |

#### Feedback (1)

| Component       | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| AnimatedTooltip | Avatar row with animated tooltips that follow mouse movement |

#### Media (1)

| Component | Description                                                    |
| --------- | -------------------------------------------------------------- |
| Compare   | Before/after image comparison slider with hover and drag modes |
