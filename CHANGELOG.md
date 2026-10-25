# Changelog

## 0.18.0

_The low-light release._

This one was made at the hour when the light goes. Four small landscapes are painted dot by dot on a grid, each with a day and a night, and a lens follows the pointer to show them in full colour. A pixel sun switches the theme: click it and the new colours spread from it in a staircase wave, led by a dithered halo. A reading lamp now travels down the rail beside long pages, items lean toward a magnet, and a dotted thread draws a story from node to node as you scroll.

On a display that can show more than white, the sun, the lit windows, the stars and the wave climb past that white, as hard squares with halos built from dithered cells. Everywhere else the picture stays exactly as drawn.

_Below: what changed in the Svelte package. The site changes ride along with it, since the docs live here._

### Minor Changes

- e8f2c64: Add MagneticField: a field in which every `MagneticItem` is pulled toward a magnet and leans toward the magnet's side, then springs home without overshoot when the magnet leaves. The pull falls off smoothly with the distance from each item's edge, lighter items (`mass`) move and lean more than heavy ones, and `polarity={-1}` repels. The magnet is the pointer by default, a controlled `position`, or a draggable, keyboard-operable `MagnetPuck`. Reduced motion keeps every item at rest. The motion lives in a framework-free core shared by the Svelte, React and Vue packages.
- d452e5e: Add PixelScene: an animated pixel-art landscape painted on a dot grid. At rest only sparse ink dots and the lit cells show; a round lens that follows the pointer reveals the full picture in colour, with a dithered rim. Four scenes (alpine, meadow, sea, mountains), each with complete day and night palettes. On HDR displays the sun, windows, stars, fireflies and the lens are redrawn as hard squares brighter than SDR white in a WebGPU layer, with halos built from dithered cells; nothing is created elsewhere. Reduced motion freezes the scene and snaps the lens. The engine, the scenes and the HDR layer are framework-free cores shared by the Svelte, React and Vue packages.
- b9f0487: feat: add StoryThread and StoryNode, a narrative thread for scroll stories. Sections pan sideways as the page scrolls while a dotted line draws itself from node to node, a glowing head rides its tip, nodes light up as it reaches them, and segments can fork and meet again. Vertical layout below 900 × 520 px, optional `sound` tick on each node.
- cfc8b0b: Add SunSwitch: a theme switch drawn as a pixel sun. On hover a soft lens follows the pointer and shows the sun's true colours over a monochrome scene; on click the new theme spreads from the sun as a view transition clipped by a grid-aligned staircase, led by a dithered halo in the sun's four colours. The component only reports the new value through `onCheckedChange` (called inside the transition), so any theme system can flip there. Browsers without view transitions, and a `contained` mode scoped to one element, get the same wave painted over a sheet of the old colour. Reduced motion switches instantly. The wave is also exported on its own as `pixelWave()` for any trigger. Rendering and the wave live in framework-free cores shared by the Svelte, React and Vue packages.
- 5824459: TracingBeam redesigned as a reading lamp on a rail. The lamp sits on the reader's line of sight (`readingLine`) and trails the scroll on a spring; what has been read stays softly lit; a marker on the rail stands for every heading in the content and lights up as the lamp passes it. The rail now lives in its own gutter column (`--tracing-beam-gutter`) instead of hanging outside the wrapper, so it is never clipped; colours follow the theme (`accent` / `--tracing-beam-accent`) instead of fixed hex values; and under `prefers-reduced-motion` the lamp still tracks the page instead of disappearing. Fixes the beam that stayed unlit on most pages (its scroll maths assumed the wrapper filled the viewport) and the shared gradient id that made every beam after the first follow the first one.

### Patch Changes

- 6b46cd4: Astro setup documented in the README and on the Installation page: the official Svelte integration plus the Tailwind entry, components rendered statically by default, and hydrated components imported through a local `.svelte` file, since a `client:*` directive on a package-root import ships the whole library to the browser. A new consumer app (`examples/consumers/astro`, `pnpm consumers astro`) builds that setup from the packed tarball and checks it in Chromium, `ClientRouter` navigations included. No change to the package itself.
- 16055a2: Copy-source registries: every item now carries its author and `meta` (MIT licence, the package and version its files were cut from, its docs page), the Svelte index lists `registryDependencies` on every entry as its CLI's schema requires, and the generated indexes and items are validated against the registry CLIs' published JSON Schemas in CI. A new docs page, Getting started → Copy source, covers prerequisites per framework, the add command, updating a copied component, mixing copies with the package, dark mode and what the registries leave out.

## 0.17.0

_The night-shift release._

This one was built between two mornings. On the evening of 21 October the lights went on in every room of the house, and they stayed on: a hundred and more pull requests in forty-eight hours, twenty to forty agents working side by side with one conductor, reviews reading reviews, a merge every few minutes, and a verification of the whole tree before anyone went to sleep.

What is left behind is a tidy house. Every preview on the documentation site renders again and a sweep now checks all 152 of them on every pull request. The brand mark takes you home. Every page says where you are, how to edit it, and where to report what is wrong. Fifteen catalogs were read, line by line, by people who speak those languages — plurals, right-to-left, punctuation and all — so the same library now speaks in sixteen voices without an accent.

Then the sun came up, and we shipped.

_Below: what changed in the Svelte package. The site changes ride along with it, since the docs live here._

### Minor Changes

- 7b57726: Add FollowButton: a follow toggle that flips at once, then commits when `onToggle` resolves or rolls back, shows the error and announces it when it rejects (a second click retries). `following` is bindable and a parent write during a pending attempt wins. The accessible name stays stable, a pending attempt is `aria-busy` rather than `disabled`, the width is held across every label, and the "Unfollow" preview only appears on hover or keyboard focus of a fine pointer. `sound` plays toggle-on, toggle-off and error cues. The state machine lives in a framework-free core shared by the Svelte, React and Vue packages.
- a4a29bb: Form contract for the action controls: Toggle takes `name`, `value` and `form` and submits `value` (default "on") through a hidden input while pressed, ToggleGroup takes `name` and `form` and submits one entry per selected value, and both keep their buttons at `type="button"`. Button, CopyButton and FollowButton behaviour is pinned by new form tests: `type`, `name`, `value`, `form` and `formaction` reach the native button, a loading Button never submits, CopyButton and FollowButton never submit, and `aria-invalid` passes through.

  A Button rendered as a link keeps its `href` and its tab stop while `loading`, so keyboard focus is not lost mid-request; it is marked `aria-busy` and `aria-disabled` and its click and middle-click are blocked instead, while a consumer middle-click listener is still forwarded when the link is not loading. The hidden input of Toggle now lives inside the button, so the component keeps a single root element. A selected ToggleGroupItem that is disabled on its own still submits; only a disabled group submits nothing.

- 743cc05: Toast: `toast()` takes `onClose(reason)`, called exactly once with `"timeout"`, `"dismiss"`, `"action"` or `"evicted"` (pressing the action settles it as `"action"` before its handler runs and does not close the toast), and `progress: true`, a thin bar that drains over `duration`, pauses with the toast and stays full under reduced motion. This is what lets an undo flow commit a deletion only when nothing took it back.
- 659b0a4: Add Collapsible and Accordion. `Collapsible` (`CollapsibleTrigger`, `CollapsibleContent`) is a single disclosure with a bindable `open`, `onOpenChange` and `disabled`; `Accordion` (`AccordionItem`, `AccordionTrigger`, `AccordionContent`) stacks headed sections with `type="single" | "multiple"`, a bindable `value`, `collapsible`, `orientation`, a configurable heading level, labelled regions and Up/Down/Home/End navigation between headers. The collapse animates `grid-template-rows` from `0fr` to `1fr` without measuring, so an interrupted toggle simply reverses; closed content stays in the page, goes `inert` as soon as it starts closing and `visibility: hidden` once it has finished, and the motion drops to nothing under reduced motion. `forceMount={false}` unmounts closed content instead.
- 8aa9c5b: New `Badge` and `Avatar`. `Badge` is a short status pill in five variants (`default`, `secondary`, `outline`, `destructive`, `success`) and two sizes. `Avatar` shows an image behind a skeleton while it loads and falls back to one or two initials, on a colour that is always the same for the same name, when there is no image or it fails; it is a circle or a rounded square in three sizes, is named by `alt` (or `name`), and is decorative when `alt=""`. Both pass native `<span>` attributes and listeners through to the root.
- ab8df0d: MosaicGlow: new `hdr` prop (on by default). On displays that report HDR, a WebGPU layer with extended tone mapping adds the light above SDR white: the hottest tiles peak around 1000 nits and the halo gets a hot core. Elsewhere nothing starts and the mosaic is unchanged. The engine gains an `onFrame` option that exposes each painted frame's light field.
- 4f3367d: Overlay keyboard and focus fixes. Dialog and AlertDialog now put `aria-haspopup="dialog"`, `aria-expanded` and (while open) `aria-controls` on the element rendered by `trigger`. Closing a Dialog, Sheet, Drawer, Popover, DropdownMenu or CommandMenu with a click on non-focusable content outside it no longer drops focus to the page body — focus stays on the trigger it was returned to — and a click outside an AlertDialog keeps focus inside it. Combobox and Autocomplete are unaffected: a click away still blurs their input. The focus trap treats a named radio group as one Tab stop, so Tab from the checked radio wraps inside a Sheet, Drawer or Dialog instead of leaving it, and Shift+Tab onto a group with nothing checked lands on its last radio. Sheet, Drawer and CommandMenu take an `id` prop that lands on the panel, so a trigger rendered outside them can carry `aria-controls` alongside `aria-haspopup` and `aria-expanded`. A Popover with `dismissible={false}` leaves presses on the page alone while it holds focus, so text selection and blur outside it work as usual.
- 4b3f630: Sound design refresh.
  - New default palette: every gesture cue is a short tactile tap (a single oscillator whose pitch falls a couple of octaves under a natural exponential decay) instead of a pitched beep over a noise transient. Success keeps a quiet two-note bell.
  - Button-family components (`Button` and `IconButton`, `GradientButton`, `RainbowButton`, `RippleButton`, `ShimmerButton`, `InteractiveHoverButton`, `ConfettiButton`) now also play the `hover` cue when a mouse or pen enters, through the same movement-gated binding as `soundFeedback`, when their `sound` prop is set.
  - Engine: cue recipes gain two optional fields, `envelope.curve` (`"linear"` | `"exponential"`) and `glide` on oscillator layers. The master limiter now only engages near full scale, so it no longer softens the attack of short cues.
  - Fix: a decay segment could be scheduled as a flat hold (no decay at all) when floating-point rounding put the release start a hair before the decay end.

- 79612b0: The CSS entry now ships default colour tokens and a dark variant. The 18 semantic colours the components use (`bg-primary`, `border-border`, `bg-popover` and the rest) now produce rules, and `dark:` utilities follow a `.dark` or `.light` ancestor and fall back to the OS preference. Apps that define their own tokens keep them: the defaults are layered, so an unlayered `:root` or `.dark` block wins. If your app switches theme only with a `.dark` class, note that the entry sets `:root { color-scheme: light dark }`: put `light` on `<html>` in light mode, or declare unlayered `:root { color-scheme: light }` and `.dark { color-scheme: dark }` (both are needed), otherwise a dark-OS machine shows dark `light-dark()` branches and scrollbars on a light page. Import the entry before your own `@custom-variant dark`, or it replaces yours. The entry also scans the cameleon skins and shared utilities.
- 803fe45: Add TickNav: a navigation list on a ruler of tick marks. Every line the pointer crosses plucks like a string (a sweep strums the ruler), neighbouring lines and ticks stretch and light up on springs, and an optional preview card follows the pointer. A `variant="neon"` turns the lines into glowing tubes with a beam of light riding every pluck; on HDR displays a WebGPU light layer (extended tone mapping) pushes the beam to ~1000 nits. Keyboard focus drives the same effect; `sound` plays a cue per plucked line. The sound rate limits drop to 30 ms for `hover` and 15 ms for `tick` so a sweep stays audibly continuous. The motion lives in a framework-free core shared by the Svelte, React and Vue packages.

### Patch Changes

- 962e2b9: Tooltip and the other anchored panels: a panel with no width of its own is now measured as the fixed box it becomes, so it centres on its trigger. Before, the first measurement read it as a block as wide as the page, and a tooltip opened pinned to the left edge of the viewport.
- 5a25c89: `fancy-ui-svelte/cameleon` now works in any Svelte 5 app, not only SvelteKit ones: `FancyProvider` no longer imports from `$app/environment`, so plain Vite + Svelte projects can render it without an unresolved-import error. Server-rendered markup is unchanged.
- 0787f52: `fancy-ui-svelte/package.json` is now an exported subpath, like in the React and Vue packages, so tooling that reads a package manifest by specifier resolves it instead of hitting the exports map. The README lists the peer range and every exported subpath (the package root, `tailwind.css`, `cameleon`, `cameleon/retro-kit`, the `cameleon/*` wildcard and `package.json`), and the comments in `tailwind.css` now read the same in all three packages; the CSS it compiles to is unchanged.
- 677ff81: CopyButton keeps its width when the label changes: the button reserves the widest of the idle, copied and failed labels, and the text now swaps with a short out and in instead of jumping. `onCopy` also reports the value that was actually written when `value` changes while a copy is still in flight.
- 01b703d: CardContainer, CardItem, CardSpotlight, GlowingEffect, GlareCard, FrostedGlass, Focus, AppleCard, AnimatedTestimonials, DirectionAwareHover, InteractiveGridPattern, ShimmerButton and RippleButton now snap under reduced motion: their transform, opacity and filter transitions only run when the user has no motion preference, and the state change itself (tilt, spotlight, focus frame, word blur, hover scale) still happens instantly. GlowingEffect also drops its JS-timed angle glide, so the glow arc lands on the pointer angle in the same frame instead of easing toward it.

  The gating covers the duration and delay utilities too (an ungated duration next to a gated transition made the property fall back to `all`), colour fades stay on, the shimmer and ripple hover fades are gated, and DirectionAwareHover drops its document-wide reduce rule: its fades now collapse to 0 in script instead.

- a442fa3: ConfettiButton no longer submits a surrounding form: `type` now defaults to `"button"` (overridable), and `class`, native button attributes and a click callback are forwarded. The callback runs once after the burst; a disabled button fires neither.
- 69c1d44: DisplacementText now honours `prefers-reduced-motion`, at mount and when the preference changes: with reduce on, no render loop or WebGL context runs and the real text is shown as selectable DOM text, styled like the resting frame; turning it off starts the effect again without remounting. Tearing the scene down (unmount, reduce turning on, a failed build) now releases its WebGL context at once instead of leaving it to garbage collection, so repeated mounts no longer run into the browser's cap on live contexts. The same static text is used when WebGL2 is unavailable, when the scene fails to build (nothing half-built is left behind), and after a lost GPU context. Prop changes no longer rebuild the scene (the texture is re-rasterized in place), and the pixel ratio is capped by a new `maxDpr` prop (default 2).
- c19934a: Development-only warnings no longer read the Vite-specific environment object directly, so the published package works in any bundler without packaging warnings.
- ab5b4a3: FlickeringGrid and FallingStarsBg now default to `color="currentColor"` instead of a fixed `#000000` / `#FFF`, so the effect follows the surrounding text colour and stays visible in both light and dark themes (the engine re-reads the computed colour every frame, so a theme switch lands on the next frame). Pass a hex `color` to keep the old fixed look: `#000000` for FlickeringGrid, `#FFF` for FallingStarsBg. Sparkles keeps its `#ffffff` default but now also accepts `particleColor="currentColor"`.
- 9f9be5b: Component READMEs now show the package import (`fancy-ui-svelte`) instead of the repo-internal `$lib` path, so the snippets can be copied as-is.
- 2da1b36: FluidCursor now honours `prefers-reduced-motion`: with reduce on, no simulation starts (no animation loop, no pointer listeners, no GPU context) and the layer stays an empty, transparent canvas, including on server-rendered pages at hydration. Turning the preference on or off during the session stops or restarts the fluid without remounting the component.
- e83cf60: Docs: `CollapsibleContent` and `AccordionContent` now state in their prop documentation that `forceMount` defaults to `true` and why (stable `aria-controls` targets, server rendering, no measurement). The Collapsible, Accordion, Toggle and ToggleGroup READMEs document closed-content rendering and the form rules: a selected item that is disabled still submits, a disabled group submits nothing.
- e612e24: Declare `@sveltejs/kit` as an optional peer dependency. No shipped file imports it (a gate now checks that), so nothing changes at runtime; the entry only silences the packager warning about the docs site code that stays out of the tarball.
- 7605c44: Button, IconButton and CopyButton now forward native attributes and listeners (`id`, `aria-*`, `data-*`, `onfocus`, ...) to their `<button>`, or to the `<a>` once `href` is set. The disabled and loading guards, the inert-link attributes and the button `type` still take precedence, and CopyButton accepts a click handler that runs right after the copy starts.
- 010aeb9: Book (and its header, title and description), BoxReveal, BentoGrid, BentoGridItem, BentoGridCard, ContainerTextFlip, LetterPullup, NeonBorder, PixelLoader, TerminalBlock and TypingIndicator now forward native attributes and listeners to their root element, matching React.
- dfb40a6: Link, LineHoverLink, NavbarLink, NavigationMenuLink and InlineCitation now forward native attributes and listeners (`id`, `download`, `hreflang`, `aria-*`, `data-*`, `onkeydown`, `onfocus`, ...) to their anchor, and to the marker of InlineCitation. Managed attributes (`aria-current`, `aria-disabled`, `tabindex`, `target`, `rel`, the marker's label) stay in the component's hands while they apply, an `aria-describedby` you pass is joined with the citation card's id, and your listeners run once, after the component's own logic. LineHoverLink gains an `onclick` prop in Svelte, and NavbarLink, NavigationMenuLink and InlineCitation are now open in React.
- 94f7f8c: Select, DatePicker and TimePicker now forward native attributes and listeners to their trigger button, and Combobox and Autocomplete to their text input. A consumer `aria-describedby` merges with the FormField's, `form` reaches the hidden submission input, and the managed ARIA stays the component's own.
- 5c0aa66: Input, Textarea, PasswordInput, SearchInput and NumberInput now forward native attributes and listeners (`id`, `name`, `form`, `inputmode`, `data-*`, `aria-*`, `onblur`, `onkeydown`, `oninput`, `onchange` and the like) to their inner `<input>` / `<textarea>`; a consumer `aria-describedby` is merged with the component's own description id.
- 20711cd: Checkbox, Switch, Slider, RadioGroup, RadioGroupItem and FileUpload now forward native attributes and listeners to their focusable element (the input, or the radiogroup root for RadioGroup), so `aria-*`, `data-*`, `form` and `onblur`-style handlers reach it and the control can join a form. FileUpload's native `name`/`required` submission only works in React: the Svelte and Vue pickers clear the input after each pick, so read `files` there.
- 617edf6: Triggers and items now forward native attributes and listeners to the element they render: `DropdownMenuTrigger`, `DropdownMenuItem` and `DropdownMenuSubTrigger`, `TabsTrigger`, `NavigationMenuTrigger`, `SourcesTrigger`, `ToggleGroupItem`, `Toggle`, the `Popover` trigger, `ComposerSubmit`, `ComposerModelPicker` and `ComposerInput` (its textarea). `id`, `data-*`, `aria-*` and listeners such as `onfocus` or `onkeydown` reach the button, menu item, tab or textarea; the managed ARIA and state attributes (`role`, `aria-expanded`, `aria-pressed`, `aria-selected`, the roving `tabindex`) stay the component's, and a consumer `onclick` runs once after the component's own handling and not while the part is disabled.

  React Toggle: `type` and `aria-pressed` can no longer be overridden by props, and `onClick` now runs after `onPressedChange`.

- 0d312da: ImageTrailCursor now honours `prefers-reduced-motion`, at mount and when the setting changes during the session: while reduced motion is preferred the trail is off (no pointer listeners, no animation loop, no images spawned), and it starts or stops in place when the preference flips, without a remount.
- 61a5358: Presence: consumer `onintrostart`, `onintroend`, `onoutrostart` and `onoutroend` handlers are now called after the component's own logic instead of being silently overridden.
- 6195158: RainbowButton now honours its public contract: the consumer click handler is called once per activation (never while disabled), native attributes such as `aria-label` and `data-*` are forwarded to the rendered element, and a disabled link is inert (click cancelled, `href` dropped).
- 0071aaa: FollowButton: with no explicit `variant`, the primary state now keeps a transparent 1px border, so the button no longer grows by 2px when it flips to the outline on follow. The Follow button docs example now reads the "Fail next request" switch when the request starts.
- 6f91504: Pointer effects no longer trap vertical page scrolling on touch screens, and pinch zoom stays available. ImageTrailCursor and EditorialEngine replace `touch-action: none` with `pan-y pinch-zoom`, and ImageTrailCursor's touch listeners no longer cancel the gesture. TextRevealCard no longer cancels touchmove, which kept a swipe over the card from scrolling the page, and now declares `pan-y pinch-zoom`. Compare, which declared no touch-action, now declares `pan-y pinch-zoom`, so a horizontal drag moves the handle while a vertical swipe scrolls the page. EditorialEngine claims the gesture only when a touch starts on an orb, so orbs still drag in any direction while the rest of the stage scrolls the page.

## 0.16.0

### Minor Changes

- 9b5103b: Every component is now also published as a copy-into-your-project registry item served by the docs site (/r/svelte/registry.json, /r/svelte/<slug>.json): the component folder plus the shared internals and sound modules and the sibling components it needs, installable with the ecosystem CLI by URL.

## 0.15.0

### Minor Changes

- 16fa701: AnimatedTooltip: presence stack. Each avatar sits in a thin conic presence ring (accent pair plus a white-hot arc). The ring rests at 35% opacity and lights with a soft halo on hover or focus, and a hairline in the surface colour separates stacked avatars. The active avatar lifts and its neighbours part (6px, then 2px) to make room. The tooltip is now a theme-aware glass card with a pointer notch. It rises on a light overshoot curve and keeps the pointer lean, and one line of light sweeps under the name when it opens, replacing the two coloured underlines. New props: `accent`, `size`. DOM/class changes: the item wrapper gains `at-item`, plus `at-active`/`data-active` when active and `at-parted`/`data-part` with `--_at-shift` when parted. The img is wrapped in `.at-avatar` (which gets `at-lifted`), next to aria-hidden `.at-glow`, `.at-disc` and `.at-ring` layers. The tooltip content moves into `.at-card`. The hard-coded black tooltip and the `size-14 border-2 border-white` avatar classes are gone. New themeable CSS variables: `--at-accent`, `--at-accent-2`, `--at-separator`. Reduced motion: the card only fades in and out; there is no lift, parting, lean, ring rotation or sweep, and the ring still lights.

  Marquee: an eased conveyor with soft edge fades. With `pauseOnHover` the track now brakes to a stop over about half a second when the pointer or keyboard focus enters, and pulls away just as smoothly on leave, instead of freezing. The CSS keyframe stays as the server-rendered base and each track is upgraded to a Web Animations animation whose playback rate is eased by a frame loop that sleeps once settled. Items dissolve into both edges through an eased alpha mask whose width is set by `--marquee-fade` (default 12%). ReviewCard becomes a nested hairline double frame: near-black `#141416` in dark mode, `#fafafa` in light, an avatar in a hairline ring, quieter type, and a soft top-edge highlight on hover. New props: `fade`, `speed`. DOM: the root gains the `marquee` class, plus `marquee-fade` when fade is on, `marquee-vertical` when vertical, `marquee-upgraded` once script-driven, and an inline `--marquee-speed`. Tracks gain `data-marquee-track`, and every copy after the first is `aria-hidden="true"`. ReviewCard gains an inner panel div and an aria-hidden sheen span, and its colours read `--review-card-*` custom properties. Reduced motion: a still row with the same composition. No keyframe, no Web Animations and no frame loop run; the edge fades stay.

  BentoGrid: framed tiles with a rising accent glow. Every BentoGridItem and BentoGridCard is now a nested double frame: an outer hairline frame around an inner panel with its own hairline and a soft top light, with ambient shadows only, mirrored for light and dark. On hover or keyboard focus, a blurred accent glow with a white-hot core rises from the bottom of the panel, the bottom edge lights up, the content lifts 6px, the icon's inset tile brightens, and a card's CTA slides in from the left. The first time the grid scrolls into view, the tiles fade up in a capped stagger. New props: `reveal`, `accent` (on BentoGrid). Tiles now render an outer `.bento-tile` frame div wrapping an inner `.bento-panel` div. BentoGridItem's outer radius moves from rounded-xl to rounded-2xl. Item icons sit in an inset tile on the same row as the title. The Card no longer shrinks its icon or leaves an empty icon placeholder, and its CTA now sits in the flow below the description instead of being absolutely positioned. Direct grid children receive the inline `--bento-i` and `--bento-delay` properties. Reduced motion: no reveal (tiles are visible at once), and hover changes colour and opacity only, with no lift, no glow travel and no CTA slide.

  ContainerScroll: a scroll-driven aperture replaces the tilted card. The card starts as a slim horizontal slit with a bright seam (accent glow, white-hot core, wide faint haze). As the section scrolls in, the slit opens vertically through an eased `clip-path: inset()`, the seam splits into two lit lips that ride the opening edges and fade, a veil lifts off the content while it settles from `scale(1.08)` to `1`, the card rises 24px, and the title blurs (0 → 6px) and fades once the aperture is a quarter open. The frame is a nested hairline frame (near-black `#0f0f10` / light `#f4f4f5` outer frame, inner surface with its own hairline) with an ambient shadow that grows with the opening; no 3D rotation or perspective remains. New props: `accent`, `accentSecondary`. DOM/class changes: the `perspective` wrapper and the `rounded-[30px]` grey bezel are gone; new classes are `.cs-root`, `.cs-title`, `.cs-track`, `.cs-stage`, `.cs-card`, `.cs-surface`, `.cs-content`, `.cs-veil`, `.cs-seam` and `.cs-lip`. The root is now `w-full`, `h-[48rem] md:h-[64rem]`, top-aligned, and the card uses an aspect ratio (`4/3`, `16/10` from `sm`) instead of fixed heights. Progress is measured from the card's own rect and throttled to one update per frame. It is exposed as the `--cs-progress` and `--cs-open` CSS variables. Reduced motion: the card is always fully open and still, the title stays sharp, and no seam or lips are drawn.

  Timeline: a light rail instead of a gradient bar. The track is now a 1px hairline faded at both ends. A small glowing head (white-hot core in dark mode, soft blurred halo and a short streak above it) rides the reading line where sticky labels dock, leaving an accent trail that brightens into it. Each entry's dot starts as a hollow ring and ignites when the head reaches it: it settles to full size, fills, glows and sends out one faint ring. Labels gain a small mono index; the entry under the head is bright with an accent tint, passed entries dim to 50%. New props: `accent`. The root now carries `data-motion` and the `--tl-progress` (px) and `--timeline-accent` custom properties. Rows, dots and the head expose `data-timeline-row`/`data-state`, `data-timeline-dot`/`data-lit` and `data-timeline-head`. Reduced motion: no head, halo or streak; the rail fills with a plain accent line up to the reading position, and dots light by position instantly with no scale, glow or ring.

  SmoothCursor: multiplayer-style cursor with a trailing name pill. The default arrow is now an upright, tail-less arrowhead. It is filled with a colour gradient that goes white-hot at the tip, with a crisp white rim, a dark drop shadow and a soft glow in its own colour. An optional name pill sits at its lower right. The pill follows on its own softer spring, stays within 24px of the arrow, tilts slightly with speed, and dims to 35% after the pointer rests. The spring loop now sleeps once everything settles. New props: `label`, `color`, `rotate`, `idleFade`, `labelSpring`. The layer is now a fixed zero-size root (`.smooth-cursor`, which carries `class`, the visibility classes and `aria-hidden`). It holds `.sc-pointer` (the moving arrow) and `.sc-label[data-smooth-cursor-label]` (the pill, with an `is-idle` class). The shared core gains a `label` element, `setLabel()`, the `labelSpring`, `rotate` and `idleFade` options and an `onIdleChange` callback. Rotation with travel is now opt-in through `rotate`. Reduced motion: the arrow and the pill snap to the pointer with no trailing or tilt, and the idle dim switches instantly.

  BorderBeam: a single comet on a rail. The stock gradient square is replaced by one directional comet: a white-hot head, a long feathered tail fading from `colorFrom` to `colorTo` that bends around corners, a dim hairline that lights up only within the comet's reach, a soft bloom and a tight halo on the edge, and a faint spill of light inside the card. The light theme uses deeper inks and a saturated core. New defaults are a calm ice-to-lilac pair (`#8ec5ff` → `#c084fc`) and a 9s lap. `delay` now works as a phase, so stacked comets are spread out from the first frame instead of sitting frozen. `anchor` is now where the comet starts and rests, as a percentage of the perimeter. New props: `tail`, `glow`, `reverse`. The root keeps `.border-beam` and its `--border-beam-*` vars, and now also carries `aria-hidden="true"` and `data-direction`. It holds layered children (`.bb-spill-clip`, `.bb-bloom`, `.bb-halo`, `.bb-ring`, `.bb-spark`) instead of an `::after`. Reduced motion: the comet is parked at `anchor` with its tail laid out behind it, glowing softly, with no travel and no fade-in.

  Stepper: lit connectors. Each rail between steps is now a hairline track that fills with a single run of light when the step before it is completed. A soft comet with a bright head travels once along the rail over 420ms, and the rail settles to the accent at reduced strength. A jump across several steps lights the rails one after another, and each bullet settles as the light reaches it. Stepping back retracts the rails from the far end. The current bullet has a slowly breathing halo (opacity only, no scaling), the completed bullet flips its number to a check that draws itself, and upcoming bullets are a quiet hairline ring. Vertical rails now show: they previously collapsed to zero height. New public CSS variables: `--ft-step-rail`, `--ft-step-glint`, `--ft-step-outline`, `--ft-step-sweep-duration`. DOM/class changes (all additive): a lit rail gains `ft-step-connector-lit`, and every li gets `ft-step-animate` once motion is confirmed. A lit rail now reads the accent instead of `--ft-status-done`; set `--ft-step-rail: var(--ft-status-done)` for the previous green rails. Reduced motion: colour cross-fades only, with no comet and no stagger.

  Dock: a lit glass shelf. The shelf is near-black translucent glass in dark mode and white/75 in light, with a hairline border, a 1px inner top highlight, a nested inner frame 4px in and a soft drop shadow. A blurred pool of accent light with a white-hot core follows the pointer inside the shelf, and a 1px masked ring brightens the shelf edge only near the pointer. Each icon casts a soft floor reflection (a contact shadow in light, an accent glow in dark) that grows with it, and the icon under the pointer gets a 4px indicator dot (beside it on a vertical dock). Magnification now follows a cosine bell with 180ms ease-out size transitions, and it is measured in viewport coordinates, so it no longer targets the wrong icons on a scrolled page. New props: `spotlight`, `reflection`, `ariaLabel`. The toolbar now emits `aria-orientation`, `aria-label` and the data attributes `data-orientation`, `data-spotlight`, `data-reflection` and `data-hover`, and writes `--dock-x`/`--dock-y`. Reduced motion: icons keep their 40px size and the indicator dot still follows the pointer, while the spotlight holds still, dim and centred, and the lit edge is off. Devices with no hover get no magnification, no spotlight and no tracking.

  AnimatedBeam: fibre optic with dispersion. The link is now a theme-aware glass fibre (translucent core, hairline rim, a hair of glint). A light packet travels along it: a white-hot head followed by three chromatic sub-pulses (start, mixed, stop colour), each longer, dimmer and further behind, so the tail spreads out like light through glass. Every layer sits over a soft blur. On arrival, a halo swells behind the destination element and a single ripple leaves it. New props: `pulses`, `tail`, `glow`, `seed`. `pathColor`/`pathOpacity` now default to the theme-aware glass; passing `pathColor` still draws a plain line at 0.2 opacity. The default `duration` is seeded (4–7 s) and ids come from the component instance, so server and client renders agree. The sliding SMIL gradient is replaced by CSS dash animations. The SVG gains `aria-hidden="true"` and `data-duration`, plus `.fibre`, `.packet`, `.bloom` groups; the fibre is themable via `--beam-fibre`, `--beam-fibre-rim` and `--beam-fibre-glint`. Reduced motion: no packets and no bloom; the fibre holds a still soft gradient from the launch end to the landing end.

- e056d07: ImageTrailCursor: nine new trail variants. `scale` pops each image in with a bouncy scale and shrinks it away behind the cursor; `fall` springs it in, spins it and drops it out through the bottom edge; `gravity` throws it sideways with the pointer, lands it on the bottom edge and bounces it twice; `flame` flickers it in and lets it rise as it burns away, tilting harder the faster the pointer moves. Five reveals draw each picture from fragments that open and close in sequence: `venetian` (slats, top to bottom), `curtain` (strips from their centre line), `hexagon` (a honeycomb growing from the centre), `liquid` (swelling blobs) and `zoom-split` (quadrants flying out of the centre). `fall` and `gravity` measure the container's height, so give it a height and `overflow-hidden`.

### Patch Changes

- 901005b: `searchComponents()` now also matches a component's tags and ignores surrounding whitespace in the query, through a new `matchesQuery()` helper in the registry. The docs components gallery gets a redesign built on it: real preview thumbnails on every card, category sections, a sticky search and filter bar, and filters kept in the URL.
- c937cf0: Docs site: a new homepage and an Inspiration platform at /inspiration. The homepage moves to a dark, rim-lit art direction — multicolour edge light, a glass panel over a luminous field, and a petrol-film iridescence on the title — built from the library's own components, with a working search, six curated previews, collections, product compositions and a per-framework install block (React, Svelte, Vue). /inspiration is a filterable gallery (search, type, interaction, style, framework and code availability in the URL; Curated/Latest sort); live cards run the real components and a tune panel retunes them in place, external open-source references carry their own licensed capture with a one-line reading and implementation clues, and each reference has a shareable detail page with a "Why it works" analysis, a React/Svelte/Vue variant panel derived from the real package exports, Save and Copy brief; /inspiration/saved keeps bookmarks in this browser. /finds now redirects there. A site-wide switch pauses decorative motion and is honoured alongside prefers-reduced-motion.
- f2b5284: README: an animated preview of the components replaces the static hero image, and the README is brought up to date — 146 components, the React edition (`fancy-ui-react`) with its setup, the docs built for coding agents (per-component Markdown pages and `registry.json`), and a Quick Start example that renders on its own.
- 73d429c: Fourteen canvas, WebGL and pointer-driven components now run on a framework-free core (`<slug>-core.ts`: `create<Name>(elements, options) → { setOptions, resize, destroy }`) with the Svelte component reduced to markup and prop plumbing. Public props, defaults, timing and rendering are unchanged; the cores are byte-shared with the other framework packages and gated in CI. Small observable deltas that fell out of the refactor:
  - `MatrixRain`: a runtime `glyphSize` / `density` change re-lays the grid once instead of twice (the second, one-frame-later black flash is gone).
  - `FlickeringGrid`: a frame that survived unmount no longer keeps drawing on the detached canvas.
  - `NoiseReveal`: a browser without WebGL leaves the host empty instead of throwing during mount.
  - `MosaicGlow`: with no 2D context available, no pointer listeners are attached (they were inert before).
  - `FireworksHdr`: the visibility and resize observers are created at mount rather than at renderer activation; both are disconnected on unmount.

  Components: bg-falling-stars, bg-stars, confetti, displacement-text, fireworks-hdr, flickering-grid, fluid-cursor, glowing-effect, liquid-text, matrix-rain, mosaic-glow, noise-reveal, smooth-cursor, sparkles.

- 319e317: Shared-core hardening. The framework-free engine and helper modules that both packages ship are now byte-identical across packages, with a gate (`pnpm check:cores`, manifest `shared-cores.json`) that fails the moment a copy drifts. Behaviour fixes that landed on the Svelte side while aligning them:
  - `focusTrap`: a focusable control inside a `display: none` ancestor is no longer treated as a tab stop, so the trap never lands focus on a control that cannot take it.
  - `anchorPosition`: the floating element is measured on its layout box (not the transformed box mid-entrance), and the applied position is stripped on destroy.
  - Listbox core: `setActive` refuses an out-of-range index instead of publishing a dangling `aria-activedescendant`.
  - Sound engine: a custom theme layer longer than the 400 ms ceiling is clamped when the theme is set directly.
  - `ImageTrailCursor`: moving the pointer over an empty image pool no longer throws.

  Internal: `_internals` actions are typed structurally (no framework type imports), and dev-only diagnostics were removed from the shared WebGL/WebGPU engines.

- 3fdcc8c: Fixes surfaced by review of the shared cores:
  - `FocusTrap`-driven surfaces (Dialog, Sheet, Drawer, menus): a native control carrying `tabindex="-1"` is no longer treated as the last tabbable item, so Tab from the preceding control stays inside the modal.
  - Scroll lock restores the horizontal scroll position as well as the vertical one when the last locked surface closes.
  - `SmoothCursor` restores the inline body cursor it replaced instead of clearing it.
  - `ImageTrailCursor` with no images no longer starts an idle animation-frame loop on the first pointer move.
  - `FireworksHdr`: `quality`, `interactive`, `onReady` and `onLost` are read live, so a value changed while the GPU is still starting or recovering is honoured, and the wrapper's observers are torn down with the engine (handle `cleanup()` or an unrecoverable GPU loss).
  - `FluidCursor`: `onReady` is read live, so a callback replaced before the GPU finishes initialising receives the handle.

- 6d72221: The declared Svelte peer range is now `^5.20.0`, which is what the components have required since they adopted `$props.id()` for stable ids; `^5.0.0` let older Svelte 5 installs fail at runtime.
- 6d72221: The published tarball no longer ships the test suites, test harnesses, the scaffold template, the per-folder READMEs or the Web Audio test mock (0.14.0 carried 566 test files). Component imports inside the package now use explicit `.js` specifiers, so `dist` resolves under strict ESM resolvers as well as bundlers.

## 0.14.0

### Minor Changes

- 74d3a3f: Compare: the seam is now a blade of light. A white-hot core with a chromatic fringe and a glow that spills onto both pictures replaces the gradient line and star field, pulses of light run along it (faster while you interact), and moving the seam leaves a trail behind it that stretches with the speed of the gesture. The handle is a frosted glass bead with a ring of light. New `beamColors` (one or more colours) and `label` props. The slider now works from the keyboard (arrows, Shift+arrows, Page Up/Down, Home/End), autoplay eases at the ends, and in hover mode the seam glides back to its resting place instead of snapping. Reduced motion turns off the pulses, the trail and the glide. `StarField` is still exported but no longer used by Compare.
- d8dd088: Add DatamoshTransition, a page-transition overlay that looks like a corrupted video decode: a fixed grid of columns, narrow on the left and wide on the right, fills with flat blocks of saturated colour that fall, stretch open through the middle of the frame and squeeze shut again. `cover()` drops the columns over the page right to left, `reveal()` lets them fall away; both return promises, so the overlay slots into any router's navigation hook. Reduced motion covers and clears instantly on one still frame. Four cover shapes (`variant`: curtain, rise, split, interlace), five column orders (`sweep`: right, left, center, edges, random) and five palette presets (`colors`: broadcast, sunset, thermal, mono, acid). `source` decodes a picture instead: the tiles take their colours from an image, a canvas or a URL.
- b6ff83a: FlipCard: a physical, accessible flip. The card now lifts through the middle of the turn and lands with a slight overshoot, its shadow spreads and gathers, and the faces catch the light as they turn (a sweeping sheen, and a shade that deepens edge-on). It keeps turning the same way instead of rewinding, and in hover mode it turns the way the pointer travels. New props: `trigger` (`"hover"` default, or `"click"` for a toggle button with Enter/Space), bindable `flipped`, `onflip`, `duration` (700 ms), `glare` and `label`. Hover mode now also flips on keyboard focus and on tap. The face turned away is `inert` and `aria-hidden`. Both faces follow the theme (`bg-card`, `text-card-foreground`) instead of a hard-coded dark back. Reduced motion cross-fades the faces instead of turning.
- 18645b5: GlowBorder: a new look, closer to polished metal. Iridescent reflections now flow along a dark chrome ring (two metallic conic fields turning against each other), a glint rides around it and spills a soft glow on both sides of the edge. Still pure CSS. New props: `preset` (`"chromatic"`, `"silver"`, `"gold"`) and `strength` (0–1, the glint and its glow). `color` now tints the metal's reflections and overrides the preset; it no longer has a default (it was `"#FFF"`). `borderWidth` defaults to 1.5 px (was 2). Every palette has a light-page version, switched by `.dark`. The overlay is now `aria-hidden`. `GLOW_BORDER_PRESETS` and the `GlowBorderProps` / `GlowBorderPreset` types are exported.
- 5384a75: Meteors: a meteor shower in depth. Each meteor now sits at its own depth (near ones larger, brighter, longer-tailed and faster), has a glowing head and a tail that fades out, fades in instead of popping, and about one in five flares before it burns out. The field is seeded, so the server and the client render the same markup (it used `Math.random()` at render time), spreads across the whole width instead of an 800 px band, and starts part-way through the shower instead of in a burst on load. New props: `angle`, `speed`, `color` and `seed`. The default colour follows the theme (slate on light pages, pale blue-white under `.dark`). Reduced motion shows a still sky. Each meteor is now `aria-hidden`.
- b55ddbf: NeonBorder: a real neon tube. A faint two-colour tube now runs all the way round the content, and two beams, one per colour, chase each other along it from opposite sides, each with a white-hot core and a glow that spills both inside and outside the edge. The tube flickers once as it ignites, then the glow hums with a slow breathing. `animationType` keeps its meaning (`none`: two lit corners; `half`: short beams; `full`: long beams). The container no longer clips its overflow (the glow would be cut off), and the inner `.neon-layer-one` / `.neon-layer-two` elements are replaced by `.neon-tube`, `.neon-glow` and `.neon-core`; the animation class `neon-animated` now sits on the container. Light pages get a fainter glow. Reduced motion stops the travel, the flicker and the hum.

### Patch Changes

- 9b63cbc: Button: the press bites. Holding the button still scales it to 0.97 over 150 ms, but the down-stroke now runs on the arrival curve instead of the reversible-state one, so the scale lands in the first frames; the release keeps the softer curve and settles. The React button gains the press it never had, along with the colour channel the Svelte source moved into CSS, so the two now behave the same on click.
- eaeb229: Docs: a machine-readable surface for LLMs and agents. Every component now has a Markdown page at `/docs/components/<slug>.md` (import, props, snippets and every docs example with package imports), linked from `/llms.txt` and from each docs page (`rel="alternate"` plus a "Copy as Markdown" button). `/llms-full.txt` inlines one short working example per component and a React import line when the component is ported. The new `/registry.json` exposes the same facts as JSON. Both files describe the React edition (`fancy-ui-react`). Docs pages now show the names the package really exports (card-3d imports `CardContainer`, `CardBody`, `CardItem`), render an Events table when a component declares events, and carry richer structured data.
- 6da697a: Docs site: the Skin menu marks Brutal and Retro OS as beta. Both skins are still moving, and the badge says so next to their name. Standard is unchanged. The badge label is translated in all sixteen locales.
- 6079e20: GradientButton: a new look. The blurred rainbow ring that spun behind the button is replaced by a beam: a short arc of light, carrying every colour of `colors`, travels around the border with a fainter echo opposite it, and casts a soft coloured glow into the face as it passes. Hovering or focusing brightens the glow. The props are unchanged, but some defaults moved to fit the new look: `colors` is a softer six-colour set, `duration` 3000 ms (was 2500), `borderWidth` 1.5 px (was 2), `borderRadius` 12 px (was 8), `bgColor` `#161616` (was `#000`); `blur` now sets the softness of the inner glow. The text defaults to white. Reduced motion stops the beam at a fixed angle.
- 151b2af: InteractiveHoverButton: a more polished hover. The dot beside the label now opens into a circle that fills the button (a clip-path, crisp at every size, instead of scaling a 2 px dot a hundredfold). The resting label rolls up and out with a slight blur, and the hover label rolls up into place with its arrow a beat behind; leaving reverses at once. Keyboard focus plays the same animation. The fill colours are now CSS variables, `--ihb-fill` and `--ihb-fill-foreground`, settable from `class` (for example `[--ihb-fill:#ef4444]`); styles that reached into the old markup (`[&_div>.size-2]`, `[&>div:last-child]`) need to move to them. Reduced motion still gets the hover state, without the travel.
- b559ed0: Landing page: the LiquidGlass panel now demonstrates the effect instead of posing for it. The test backdrop — grid, ivory disc, barcode stripes — scrolls three stage-heights inside the panel while the glass pill stays centred, so the chromatic displacement actually moves. The panel at rest is unchanged.
- c50410a: Pagination: the current-page pill now slides from the old number to the new one instead of jumping, and when the visible run of numbers shifts (a jump opens a new window, an ellipsis moves) the numbers glide to their new places while new ones fade in, so the pill lands with its number. It replaces the old one-off pop. The slide never plays on first paint, follows controlled `page` changes too, and snaps on resize. The current button keeps `aria-current` and its own fill until the pill has actually been placed, so nothing is lost without JS. Tune it with `--ft-pagination-slide-duration` (the old `--ft-pagination-pop-duration` still works as a fallback) and `--ft-pagination-indicator-color`. Under reduced motion the pill and the numbers still follow the page, without travelling.
- 89c223a: RainbowButton: hovering or focusing the button now sends a rainbow beam around its border, with a soft halo just outside it. The beam is a conic gradient turning through a registered CSS angle, one lap per 1.5 × `speed`, and it only runs while the button is hovered or focused. The resting look is unchanged. Under reduced motion the beam still fades in, frozen at one angle.
- b6e1ed3: RippleButton: a more refined ripple. Each click now sends a ripple of light from the click point: a soft glow that blooms and fades, and two fine rings spreading out a beat apart, like a wave on water, reaching every corner of the button. While it runs, the border takes the ripple's tint. A keyboard press (Enter or Space) now ripples from the centre instead of the top-left corner. Hovering adds a fingertip-over-water effect: a soft glow follows the pointer and a faint ring keeps pulsing out from it. The face is lighter too: a 1 px border, a fine top highlight and a slight press. Defaults moved to fit: `rippleColor` `#60a5fa` (was `#ADD8E6`, which barely showed on a light page) and `duration` 900 ms (was 600). Reduced motion keeps only a brief glow where you pressed, and a still hover glow.
- ca7ac7c: ShimmerButton: a new look. The spark that circled the border is replaced by a satin sheen: every cycle a soft band of light (a wide halo with a thinner, brighter core) crosses the face on a slight diagonal, lifts the label to full white, then rests. On hover the sweep hands over to a highlight that follows the pointer. A thin rim catches the same light. The props are unchanged: `shimmerColor` tints the sheen, rim and highlight, `shimmerSize` sets the rim thickness, `shimmerDuration` is one sweep plus its pause. Reduced motion keeps a faint static sheen. The inner `.shimmer-slide` and `.spin-around` elements are gone; anything that styled them should target the new `.shimmer-button__*` layers.

## 0.13.0

### Minor Changes

- c665256: Buttons cross-fade between their icon and the loading spinner instead of cutting, and give way very slightly under a press. The leading icon and the spinner now share one fixed-size cell, so flipping `loading` fades one into the other in place over 80 ms rather than swapping them in a single frame — the cell never resizes, so the label beside it never shifts. Holding a button scales it to 0.97 for as long as the press lasts, on the same 150 ms reversible-state curve the colour beside it already used; a disabled or loading button is excluded, because a press that does nothing should not pretend to. The focus ring is deliberately left out of that transition — it is painted with a box-shadow, and a focus ring must never animate. With reduced motion the cross-fade collapses to nothing and the swap is instant again, the press stops moving entirely, and the colour channel keeps working in both cases, since a colour change is not motion. One layout exception to name: the shared lead cell is a fixed `calc(1em + 1px)` box rather than one that measures whichever child is currently mounted, which is exactly what keeps the label still while both are on screen.

### Patch Changes

- a541ed0: Docs site: the Theme menu now offers System, Light and Dark only. The eleven named colour themes are gone — cameleon skins own art direction now. The docs-only theme registry no longer ships in the package files (it was never exported).
- bae13a4: FluidCursor: clicking no longer brightens the fluid forever when `fluidColor` or `fluidColors` is set. A click scaled the colour it was handed _in place_, and with a palette configured that colour is the cached palette entry itself — so every click multiplied the palette by ten again: the fifth click painted with a colour ten thousand times brighter, a few more overflowed to NaN and the fluid went blank. Random colours are fresh objects, which is why the default palette never showed it. The click now scales a copy, and the cached palette entries are frozen so a future in-place edit fails loudly instead of compounding.

  Two smaller click changes ride along. The click boost is now `min(10, 1.5 / colorIntensity)` instead of a flat ×10 on top of the already intensity-scaled colour, so raising `colorIntensity` — which the dither mode asks you to do — no longer raises the click's peak with it; the default intensity is byte-identical. And a click now _lifts_ each texel to its own profile rather than adding to it, so a burst of clicks on one spot paints the same disc once instead of summing towards white. Move splats are unchanged and still additive. No prop was added.

  Also on the WebGL path (Svelte): unmounting now deletes the engine's programs, shaders, textures, framebuffers and buffers and loses the context, instead of leaving a whole simulation's worth of GPU memory to the garbage collector and one more live context in the browser's budget on every re-key. And on all four engines, `mouseup` / `touchend` / `touchcancel` now mark the pointer released — `down` used to stay `true` for the life of the engine.

- 518894c: Docs site landing: the version badge reads the package version; the frame's primitives stay on the dark palette for light-mode visitors (the active tab was near-black on black); the primitives row no longer overflows between 1024 and 1280 px; the accent is ivory instead of violet, the calls to action are the library Button, and the "amazing?" headline and the slider drop their gradients; the image-trail panel shows landscape photographs; ⌘K and the search cell open the docs palette.

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
