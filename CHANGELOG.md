# Changelog

## 0.12.0

### Minor Changes

- 5abc321: Dialogs and alert dialogs now close the way they open: the panel and its backdrop fade out together instead of vanishing, focus comes back to the trigger the instant you dismiss rather than when the fade ends, and the page stays locked until the backdrop is actually gone. Also fixes a long-standing entrance bug where both surfaces drifted in from half their own size off-centre.

  The entrance is now 300 ms and the exit 200 ms, both on the shared motion tokens — the panel scales as well as fades, the backdrop fades alone. Pressing Escape a second time while a dialog is leaving is no longer swallowed by the panel on its way out: it reaches whatever is underneath, and the dismiss fires exactly once either way. Reopening a dialog mid-close reverses the animation from wherever it had got to instead of restarting it, and pulls focus back inside the panel so the next dismiss returns it to the trigger exactly as the first one would have.

  With reduced motion the close is fully synchronous again, exactly as before — no animation runs at all, and nothing a caller can observe waits for one in any case: `open` still flips, and `onOpenChange` still fires, the moment you dismiss.

  Three internal primitives grew to support this and are available to every overlay: the dismiss layer can now report whether it is still live, the focus trap can hand back a pair of functions that return focus immediately and re-arm the trap on a reopen, and the scroll lock has an action form that releases at unmount rather than on a state flip. No public prop was added, removed or renamed.

  No layout properties are animated by this change, so it names no exceptions to the transform-and-opacity rule.

- 35978e8: Selects, comboboxes, autocompletes, and date and time pickers now animate out as well as in — the same 150 ms, from the same edge, in reverse. Dismissing stays immediate: the value, the change callback and `aria-expanded` all settle in the tick you act, and only the panel's removal from the page waits for the fade. A second Escape during that window is no longer swallowed by the panel already leaving — it reaches whatever sits underneath — and a panel reopened mid-fade continues from where it is rather than starting over. The panel reports `data-state="open"` while it is on screen and `data-state="closing"` on its way out, and stops taking clicks the moment it starts to leave. Under reduced motion nothing animates in either direction and the close is synchronous, exactly as before. Combobox's and Autocomplete's exported context types each gain a read-only `open` member, which the panel's own transition reads to tell an arrival from a departure.
- 35978e8: Menus and the command menu now animate out as well as in. A second Escape during the fade no longer disappears into the panel that is already leaving — it reaches whatever is underneath. Dropdown, context and navigation menus reverse their 150 ms entrance from the same edge they grew out of, and a submenu now fades with the menu that owns it instead of hanging on at full strength and popping out at the end. The command menu is on the modal rung with dialogs rather than the menu rung — 300 ms in, 200 ms out, backdrop on the same clock — and the page it covers now stays locked until that backdrop is actually gone, instead of becoming scrollable the instant you dismiss. That change also retires a long-standing entrance bug where the command menu drifted in from half its own width off-centre.
- 35978e8: Popovers and hover cards now animate out as well as in — the same 150 ms, from the same growth origin, in reverse, and over half the scale distance, because leaving is a smaller gesture than arriving. Each surface has a single bidirectional transition rather than a separate entrance and exit, so one reopened mid-fade carries on from wherever it had got to instead of snapping shut and starting again; that is what a hover card needs most, since pointers change their mind. Nothing waits for the fade that should not: `open` still flips the instant you dismiss, so `bind:open` and `onOpenChange` behave exactly as they did and only the removal trails them. While a panel is leaving it is inert and cannot be clicked or tabbed into, it carries `data-state="closing"` for anyone who wants to style the exit, a popover has already handed focus back to its trigger, and a second Escape reaches whatever sits underneath instead of disappearing into a panel that is already on its way out. `PopoverContext` gains a readonly `open` — an additive field on an exported type, read by the panel's own transition to tell an arrival from a departure. Under reduced motion neither surface animates in either direction and both close synchronously, precisely as before.
- 35978e8: Sheets and drawers now slide out instead of vanishing, and a drawer flicked past the dismiss threshold carries on from wherever your finger left it rather than snapping back first. Both surfaces run one bidirectional transition, so reopening one mid-exit reverses it instead of stacking; focus returns to the trigger the instant you dismiss rather than when the slide ends, a second Escape during the exit reaches whatever is underneath instead of disappearing into a panel that is already leaving, and the page stays scroll-locked until the backdrop is actually gone. Their exits deliberately travel their full size rather than the half distance the anchored surfaces use — a sheet has to clear its own edge — and the spring-back on a drag released short of the threshold is unchanged. With reduced motion asked for, both close synchronously exactly as they did before.
- 35978e8: Skeletons now fade their placeholder bones away over the real content instead of cutting to it: the moment loading ends the content lands in its final position and the bones linger on top of it for 200ms while they dissolve, so the panel never jumps between one layer's height and the other's, and the content is readable and clickable from the first frame. Tab panels arrive with a short fade rather than a hard cut — an entrance only, so the panel you leave still goes in the same instant it stops being selected. And stepping a number field with the arrow keys now gives the same feedback a click does: the matching stepper acknowledges the step for a beat, from the very rule a press already uses, whichever way the step was asked for. Under reduced motion all three collapse to the instant behaviour they had before. One layout-property exception, named: the skeleton root becomes `position: relative` so the outgoing bones can pin themselves to it while they fade, which only matters if you were relying on that root not being the containing block for an absolutely positioned element of your own.
- 35978e8: File-upload progress bars now animate toward each new value and drive their fill with a transform rather than a width, and rows fade in and out as they are added and removed. A width change forced the browser to lay the row out again on every value a consumer pushed in; a transform costs nothing per frame, and easing toward each value over 150ms is what makes a report every few hundred milliseconds read as a bar filling rather than as a bar twitching. The indeterminate sweep moved to a transform for the same reason. Removal stays instant as far as your code is concerned — `files` and `onFilesChange` both update in the same tick they always did — and the row only lingers on screen for the length of its fade, inert for that whole window, with focus moving to the surviving row immediately rather than when the fade ends. Under reduced motion every one of these collapses to nothing: rows appear and disappear in the same frame, the bar jumps straight to each value, and the sweep stops on a static block that still marks the bar as busy. Two layout properties stay layout on purpose and are named here rather than converted: the indeterminate block's own `width: 40%`, which sizes the travelling block once and never changes it, and its `1.4s` loop period, which is a loop period rather than a transition and has no rung on the shared duration scale.
- 6b59db5: Core motion pass, first tier: the Core primitives now move on the same clock as the micro-interactions collection.

  Every floating panel — menus and sub-menus, context and navigation menus, selects, comboboxes, autocompletes, date and time pickers, popovers, tooltips and hover cards — opens with the same 150 ms rise in `opacity` and `transform`, growing from the edge nearest its trigger rather than from its own centre, and following a flipped placement when a panel moves to stay inside the viewport; each panel publishes where it landed as `data-side` / `data-align`. Tooltip keeps its open delay and its instant close; the exits of the other panels are unchanged in this tier. Three hand-written entrance keyframes are retired and two panels that had no entrance at all gain one.

  Tabs gains a sliding indicator that follows the selected tab — `transform` only, leading-edge origin, snapping into place without a tween on first paint and on resize, tracking without animation under reduced motion. CopyButton's icon is now a status glyph: a copy attempt closes a ring and draws a check or, when the clipboard refuses, a cross, with a red skin, the new `errorLabel` prop (default "Copy failed") and a single assertive announcement — a denied permission is no longer indistinguishable from a success; `--ft-copybtn-success` is replaced by the shared `--ft-status-done` / `--ft-status-error` tokens. Checkbox draws its tick and its indeterminate dash as stroked paths over 300 ms (`--ft-checkbox-draw-duration` for faster) instead of revealing a rotated border corner. Toasts animate out over 200 ms instead of vanishing; a dismissed toast stays inert in the DOM for that long.

  A hygiene sweep rounds off the state changes that used to arrive twice: current-item bars in Sidebar and Navbar, Toggle's pressed ring and Stepper's bullets and connectors now ease on the same 150 ms clock as the colour beside them (the bars move to a `::before` layer, which also restores the focus ring the old box-shadow was suppressing); Toggle, ToggleGroup items and NumberInput's steppers acknowledge a press with a 0.97 scale that reduced motion replaces with a static dim; Pagination's current page, RadioGroup's dot, FormField's error and help text, SearchInput's clear button and PasswordInput's strength bars ease in instead of snapping; Link's external arrow nudges on hover and focus; PasswordInput's reveal toggle cross-fades its two glyphs in one grid cell. Three components that animated on hover with no reduced-motion guard — LineHoverLink, InteractiveHoverButton and Dock — now have one, and Dock stops reacting to hover on touch screens. Hard-coded `0.15s ease` transitions in Switch, RadioGroup and Checkbox read the shared tokens. New per-component knobs, each falling back to the library token and then a literal: `--ft-sidebar-collapse-duration`, `--ft-link-icon-duration`, `--ft-pagination-pop-duration`, `--ft-radio-dot-duration`, `--ft-password-strength-duration`, `--ft-tabs-indicator-*`, `--ft-number-input-press-scale` / `-opacity`.

  Foundation: the duration scale gains an 80 ms `micro` rung (`--ft-duration-micro`), spent by StatusMorph's check lead-in; an internal direction-aware entrance for anchored surfaces runs both directions on the `fast` rung with the exit collapsing only half of the scale delta — a stated deviation from "exits use the exit token" so menus stay quick. Layout-property exceptions this tier relies on, by name: Sidebar's collapsible `width`, Stepper's connector colour/box-shadow pair, and the `stroke-dashoffset` draws in Checkbox and CopyButton (repaint, never reflow). Every timed rule sits inside `prefers-reduced-motion: no-preference` with the finished state as the fallback; focus is never animated; no public prop changed except CopyButton's added `errorLabel`.

- cea796e: Add the first micro-interactions collection — ten small, composable motion primitives that share one foundation and one voice: `Reveal` (content-agnostic entrance on viewport, mount or manual trigger, six presets, built-in child stagger with a `from` origin), `Presence` (an `open` boolean that animates both mount and unmount through a single direction-aware transition, inert while closing), `Magnetic` (a child that leans toward a fine pointer inside an inflated activation zone and settles home), `Pressable` (tactile press feedback for any interactive child, with keyboard parity and opt-in touch haptics), `ScrollProgress` (a reading bar driven by CSS scroll-timelines with zero JavaScript where supported, falling back to a passive, frame-throttled listener), `Skeleton` (rect, text and circle placeholders with a phase-synced shimmer or pulse and a `loading` → children swap that announces itself once — the first Core Feedback primitive), `StatusMorph` (a 1em icon whose loading ring closes into a drawn check or cross, announcing the outcome from a portalled live region so it never pollutes a button's name), `TextRoll` (per-grapheme odometer roll when a `value` prop changes, with the real, unsplit text staying selectable and screen-reader-readable), `StickyScroll` (a two-column scroll narrative whose sticky panel follows the section crossing the viewport centre, stacking by container width) and `DimSiblings` (hover or focus-visible one child and its siblings recede — pure CSS `:has()`).

  The collection is deliberately restrained. Everything animates only `opacity` and `transform` (blur is opt-in — a single root in `Presence`, the non-active siblings in `DimSiblings`), on a four-step timing scale (150 / 300 / 200 / 600 ms) and four easing tokens exposed as `--ft-*` custom properties with literal fallbacks, so the CSS-driven components can be retuned from `:root` and every component from its own props — the three JS-timed transitions (`Presence`, `TextRoll`, `StickyScroll`) read those props directly rather than the custom properties. Every autonomous animation is declared inside `prefers-reduced-motion: no-preference`, which makes the static state the fallback rather than a degraded variant; pointer effects ignore touch and `hover: none`; hidden-before-reveal content is never `display: none` and tabbing into it reveals it; exiting elements are inert; haptics are additive and touch-only. No new runtime dependency and no peer-dependency change: the internal `_internals/motion` foundation (duration/easing/stagger tokens, preset geometry, a reduced-motion rune, an `inView` action, a trailing rAF throttle, stagger maths, safe haptics and css-only Svelte transitions) is hand-rolled on the platform and stays private; only its shared unions (`PresetName`, `RevealPresetName`, `StaggerFrom`, `HapticPattern`) are exported as types.

  Each component ships with colocated tests (including a reduced-motion branch and cleanup assertions wherever jsdom can observe them), a README covering motion, touch and accessibility contracts, docs examples and a story. The test setup gains a microtask-based Web Animations API stub so Svelte transitions can be exercised under jsdom.

- fcec95f: feat: add MosaicGlow component — a cursor-lit canvas mosaic where a lagging golden halo lights random tiles into a decaying comet trail, with bloom, ambient flicker and idle drift
- e17d1d4: feat: add PulseBeam component — a breathing, hue-shifting border glow (inner ring + bloom, or outside halo) that fades in and out on an `active` flag
- 78de72a: The opt-in `sound` prop (default `false`, silent until the person using the page has enabled sound) now covers 57 more interactive components, each playing its semantic cue from inside the component's own guarded commit path — no visual change and no new interactive markup; a small number of components (Slider, Breadcrumb, ArtifactCard, ContextRing) gained one listener or funnel so the cue has a single, guarded call site: IconButton, Link, Toggle, ToggleGroup, Slider, NumberInput, Dialog, AlertDialog, Sheet, Drawer, Popover, Toaster, Combobox, Autocomplete, SearchInput, PasswordInput, FileUpload, DatePicker, TimePicker, NavbarLink, SidebarItem, Tabs, Breadcrumb, Pagination, Stepper, ContextMenu, CommandMenu, AppleCardCarousel, AnimatedTestimonials, LineHoverLink, RainbowButton, RippleButton, ShimmerButton, GradientButton, InteractiveHoverButton, ConfettiButton, ReasoningPanel, ChatMessage, PromptSuggestions, ChatError, ToolCall, ToolTimeline, CodeDiff, Sources, WebSearch, ImageGeneration, AgentPlan, SubagentList, ApprovalCard, RecommendationCard, ArtifactCard, Composer, VoiceInput, ContextRing, ScrollAnchor, ThreadList, ChatPanel.

### Patch Changes

- 7da04eb: Fix a set of upstream defects surfaced while reviewing the React port, so both packages share the same behaviour:
  - AnimatedBeam: the `delay` prop now staggers the beam (`begin` on the SMIL animations); it was declared but never wired.
  - AnimatedTooltip: the avatar wrapper no longer claims `role="button"`; keyboard focus shows the tooltip and links it with `aria-describedby` / `role="tooltip"`.
  - AnimatedTestimonials, InteractiveHoverButton, SmoothCursor, Stepper, CodeDiff, DisplacementText: small accessibility corrections (explicit `type="button"`, decorative layers `aria-hidden`, list semantics kept, add/remove verdicts and rasterised text exposed to assistive tech).
  - ContextMenu: a second right-click repositions the panel at the new pointer position.
  - Drawer, Sheet: new optional `ariaLabel` prop names the dialog when no `title` is rendered.
  - DropdownMenu: submenu panels are labelled by their trigger.
  - Select: the listbox popup carries an accessible name.
  - EditorialEngine: the article keeps its heading and paragraph semantics once the engine boots.
  - FileUpload: repeating an identical rejection is announced again.
  - FireworksHdr: the window pointer listener is removed on unmount even when `interactive` changed after mount.
  - LineReveal: `document.fonts` is guarded; `font` and `line-height` no longer clobber each other.
  - NumberTicker: a value change cancels the in-flight animation instead of running two loops.
  - RippleButton: ripple keys are unique across same-millisecond clicks.
  - Sparkles: particle coordinates are no longer double-scaled on high-DPI displays.
  - TerminalText: the glitch loop is cleaned up and survives prop changes without doubling.
  - TimePicker: committing a slot with the pointer returns focus to the trigger instead of `<body>`.
  - VoiceInput: keyboard focus follows the control across state switches.

## 0.11.0

### Minor Changes

- a5f4230: The cameleon skin engine ships in the npm package. `fancy-ui-svelte/cameleon`
  exports `FancyProvider`, the ten themable primitives and the six skins;
  `fancy-ui-svelte/cameleon/retro-kit` is new — the retro-os skin's own component
  vocabulary, grown out of a real site built on the skin: `RetroButton` (the
  shadow-ladder press key, primary/outline, sm/md), the label kit (`Chip`,
  `NumChip`, `StatusPill`, `RetroTag`, `IconTile`, `InlineIndexLabel`), the
  ornaments (`PixelGlyph`, the `steps(1)`-blinking `Led` — reduced-motion aware,
  it stays lit — and `Swatches`), and the shared accent vocabulary
  (`Accent`, `accentVar`, `accentTint`). The kit's `.r-*` recipe layer and
  `--r-*` tokens load with the kit barrel and scope to `[data-skin="retro-os"]`,
  so a kit component outside a retro-os provider is visibly unpainted rather
  than silently wrong.

  The kit also grows its windows, media and chrome vocabulary, ported from the
  reference portfolio implementation that grew the retro-os language in the
  first place: `SectionWindow` and `AppWindow` (the two DOS-titlebar window
  grammars), `NotchedFrame` (the three-layer chamfered-corner hero frame) and
  `RetroCard` (the accent-aware hover card); `VideoFrame`, `PlayBadge` and
  `EmptyMediaFrame` for poster-and-play video staging with a dashed-border
  placeholder for demos not yet recorded; and `HeaderBar`, the page-header
  shell — ink tile, clamp()'d title/subtitle, and a slot on the right for a
  consumer's own navigation or skin controls.

- 90460aa: Add five hard-edge, additive options for existing components — all defaults unchanged, no behavior or visuals change for existing consumers. `InteractiveGridPattern` gains an `interactive` prop (`false` renders a static graph-paper grid with zero per-rect mouse listeners) and a `strokeClassName` prop to recolor the grid lines without overriding the fill logic in `squaresClassName`. `BlurReveal` gains a `mode` prop (`"hard"` drops the blur/translate softening entirely and snaps opacity in via a stepped CSS timing function, keeping the same scroll trigger and stagger). `StaticLogoCloud` gains a `wordmarks` prop that renders a static typographic row of styled text instead of image logos, for brand rows with no logo assets. `LineHoverLink` gains a 12th variant, `"ink"`: a constant underline with the whole link snapping `-1px,-1px` on hover/focus instead of animating the underline in. `ImageTrailCursor` gains a `"pixelated"` trail variant: images pop in and out with no easing tails, styled with `image-rendering: pixelated` and a solid pixel-art border.
- ae3893f: Opt-in sound design. A `sound` controller synthesises eleven short interface
  cues — hover, press, toggle on and off, open, close, select, success, error,
  tick and copy — with the Web Audio API, so nothing is fetched and no audio file
  ships. A `SoundToggle` switch carries the preference and volume, the
  `soundFeedback` action wires cues to any element, and `Button`, `CopyButton`,
  `Checkbox`, `Switch`, `RadioGroup`, `Select` and `DropdownMenu` accept a `sound`
  prop to play the matching cue themselves.

  Everything is silent until a user switches it on. The audio context is created
  inside the gesture that enables it and resumed inside the gesture that plays,
  never on import, mount, navigation or scroll; hover cues are rate-limited; and
  the preference persists in `localStorage`, survives a corrupt or full store and
  follows the user across tabs. The docs header gains the switch, and the Sound
  page is a live lab for auditioning every cue with a note on when to use each one
  and when not to.

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
