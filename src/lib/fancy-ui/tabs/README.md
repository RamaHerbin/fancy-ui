# Tabs

A `role="tablist"` compound: one set of triggers, roving-tabindex keyboard
navigation, and content panels that show one at a time — account settings,
a preview/code switcher, a wizard's steps.

## Components

- `Tabs` — owns the active value and the roving-focus position, publishes both through context
- `TabsList` — the `role="tablist"` row (or column) of triggers
- `TabsTrigger` — one `role="tab"` button: reads the selection and the roving-focus position, never needs to be told either directly
- `TabsContent` — the `role="tabpanel"` matching one trigger's value

## Usage

```svelte
<script>
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "fancy-ui-svelte";

	let section = $state("account");
</script>

<Tabs bind:value={section}>
	<TabsList>
		<TabsTrigger value="account">Account</TabsTrigger>
		<TabsTrigger value="security">Security</TabsTrigger>
		<TabsTrigger value="billing">Billing</TabsTrigger>
	</TabsList>
	<TabsContent value="account">Account settings…</TabsContent>
	<TabsContent value="security">Security settings…</TabsContent>
	<TabsContent value="billing">Billing settings…</TabsContent>
</Tabs>
```

`value` needs an initial value that matches one of your `TabsTrigger`s — Tabs
does not pick one for you. Without it, no trigger is `aria-selected` and no
panel renders (unless a `TabsContent` sets `forceMount`).

`variant="segmented"` swaps the accent underline for a pill rail, matching
`ToggleGroup`'s rail:

```svelte
<Tabs bind:value={view} variant="segmented">
	<TabsList>
		<TabsTrigger value="preview">Preview</TabsTrigger>
		<TabsTrigger value="code">Code</TabsTrigger>
	</TabsList>
	<TabsContent value="preview">…</TabsContent>
	<TabsContent value="code">…</TabsContent>
</Tabs>
```

Or handle the change yourself instead of binding, with `onValueChange`.

## The context contract

`Tabs` publishes one object under a module-private key; `TabsList`,
`TabsTrigger` and `TabsContent` all read it with `getContext`. That is the
whole reason a trigger only ever takes `value` and `disabled` — the
selection, the orientation, the activation mode and the roving-focus
position are already in scope.

```ts
interface TabsContext {
	readonly value: string;
	readonly orientation: "horizontal" | "vertical";
	readonly activation: "automatic" | "manual";
	readonly variant: "underline" | "segmented";
	isSelected(itemValue: string): boolean;
	select(itemValue: string): void;
	register(itemValue: string): void;
	unregister(itemValue: string): void;
	readonly focusedValue: string | null;
	focus(itemValue: string): void;
	move(from: string, delta: number): void;
	moveToEdge(edge: "first" | "last"): void;
	focusElement(itemValue: string): void;
	triggerId(itemValue: string): string;
	panelId(itemValue: string): string;
}
```

`TabsList`, `TabsTrigger` and `TabsContent` all degrade instead of throwing
when mounted outside a `Tabs` root: `TabsList` falls back to horizontal/
underline defaults, `TabsTrigger` renders as a plain, always-tabbable,
permanently-unselected button, and `TabsContent` renders nothing unless
`forceMount` is set.

## Keyboard model

- **Roving tabindex.** Exactly one trigger carries `tabindex="0"` at a
  time — the selected one, or the first enabled one if nothing is selected
  yet — every other trigger is `tabindex="-1"`. Tab moves into and out of
  the tablist in one stop each way, never through every trigger.
- **Arrows respect `orientation`, unlike `ToggleGroup`.** Horizontal tablists
  answer only to Left/Right; vertical ones answer only to Up/Down. This
  follows the WAI-ARIA Tabs pattern rather than `ToggleGroup`'s more lenient
  "both pairs work either way" — a tablist's layout tells you which pair is
  correct, so the other pair is left alone rather than double-booked.
  Arrow keys wrap at either end.
- **Home and End** jump to the first and last _enabled_ trigger, in either
  orientation.
- **Disabled triggers are invisible to the keyboard model** — the arrows
  step over them, they never receive `tabindex="0"`, and the native
  `disabled` attribute keeps them out of the click and focus paths entirely.
- **Disabling the selected trigger changes neither the selection nor the
  visible panel.** A tab that goes disabled mid-session — a quota check, a
  permission change — keeps `aria-selected="true"` and its `TabsContent`
  stays on screen; yanking the user's current view away just because a tab
  became unavailable would be worse than leaving it. What does move is DOM
  focus: if that trigger currently holds it, focus follows to whichever
  trigger inherits the roving position, so a keyboard user does not fall out
  of the tablist — or the page — entirely. Disabling a trigger that does
  **not** currently hold focus never moves focus anywhere; only the trigger
  actually being focused when it goes disabled triggers the handoff.
- **`activation="automatic"` (the default) fuses focus and selection**:
  arrowing onto a trigger, or jumping to an edge with Home/End, selects it
  immediately — no separate confirmation step. **`activation="manual"`**
  only moves focus with the arrows/Home/End; the user then presses Enter or
  Space (or clicks) to select. Both modes get Enter/Space selection for
  free, from the native `<button>` itself — `TabsTrigger` adds no keydown
  case for either key.
- **The panel is focusable** (`tabindex="0"`), so pressing Tab from the
  active trigger lands inside the panel's content, not on the next trigger.
- **The arrow sequence follows what is actually on screen**, not the order
  triggers happened to register in — same DOM-order re-query `ToggleGroup`
  uses, so a trigger that mounts out of order, or one a keyed `{#each}`
  moves to a new position, is correct on the very next key press.

## Truncation is a Breadcrumb concept, not a Tabs one

`Tabs` never truncates its own trigger list — if you need that, decide it
yourself before handing `Tabs` its children.

## Accessibility notes on `aria-controls`

Every `TabsTrigger` sets `aria-controls` to the id its matching
`TabsContent` _would_ render, computed deterministically from `Tabs`'s own
instance id. By default, only the **active** panel is actually mounted —
every other trigger's `aria-controls` therefore points at an id that is not
currently present in the DOM. This is a deliberate trade against unmounting
inactive panels entirely (see `forceMount` below); most assistive tech
tolerates a momentarily-dangling `aria-controls` reference the same way it
tolerates the attribute being absent. If your integration or test tooling
asserts the reference always resolves, add `forceMount` to every
`TabsContent` so all panels stay in the DOM, just `hidden`, regardless of
which one is active.

## Props

### Tabs

| Prop            | Type                         | Default        | Description                                                               |
| --------------- | ---------------------------- | -------------- | ------------------------------------------------------------------------- |
| `value`         | `string`                     | `""`           | The active tab's value, bindable                                          |
| `onValueChange` | `(value: string) => void`    | —              | Called with the new value whenever the active tab changes                 |
| `orientation`   | `"horizontal" \| "vertical"` | `"horizontal"` | The tablist's stacking axis and which arrow-key pair moves it             |
| `activation`    | `"automatic" \| "manual"`    | `"automatic"`  | Whether arrowing to a trigger selects it immediately, or only moves focus |
| `variant`       | `"underline" \| "segmented"` | `"underline"`  | Accent underline, or a segmented pill rail                                |
| `children`      | `Snippet`                    | —              | A `TabsList` and one or more `TabsContent`s                               |
| `class`         | `string`                     | —              | Additional CSS classes                                                    |
| `ref`           | `HTMLDivElement \| null`     | `null`         | Bindable element reference                                                |

### TabsList

| Prop       | Type                     | Default | Description                |
| ---------- | ------------------------ | ------- | -------------------------- |
| `children` | `Snippet`                | —       | The `TabsTrigger`s         |
| `class`    | `string`                 | —       | Additional CSS classes     |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable element reference |

### TabsTrigger

| Prop       | Type                        | Default | Description                                                          |
| ---------- | --------------------------- | ------- | -------------------------------------------------------------------- |
| `value`    | `string`                    | —       | This trigger's value — which `TabsContent` it activates. Required    |
| `disabled` | `boolean`                   | `false` | Disables just this trigger; it is skipped by the arrows and Home/End |
| `children` | `Snippet`                   | —       | The trigger's content, typically the tab's label                     |
| `class`    | `string`                    | —       | Additional CSS classes                                               |
| `ref`      | `HTMLButtonElement \| null` | `null`  | Bindable element reference                                           |

### TabsContent

| Prop         | Type                     | Default | Description                                                                                     |
| ------------ | ------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| `value`      | `string`                 | —       | Which `TabsTrigger` shows this panel. Required                                                  |
| `forceMount` | `boolean`                | `false` | Keeps this panel mounted (with `hidden`) even while inactive, instead of unmounting it entirely |
| `children`   | `Snippet`                | —       | The panel's content                                                                             |
| `class`      | `string`                 | —       | Additional CSS classes                                                                          |
| `ref`        | `HTMLDivElement \| null` | `null`  | Bindable element reference                                                                      |

## Theming

The segmented rail's fill uses `bg-background`/`border-border`. The selected
segmented pill is painted by the sliding indicator from `--color-accent` — the
same variable the `bg-accent` utility resolves to, so it still follows whatever
a consumer's theme says — with `text-accent-foreground` on the trigger above
it. The underline bar and the focus ring have no semantic token in the app's
theme layer, so both fall back to a `light-dark()` accent pair, declared once
on `Tabs`'s own root and read by `TabsList` and `TabsTrigger` below it:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

Set `--ft-accent` higher up the tree to retint the underline and the focus
ring on every `TabsTrigger` beneath it — the same variable `ToggleGroup` and
`Toggle` already key off of, so one override retints all three.

The sliding indicator reads four variables of its own, all optional:

| Variable                       | Default                                                     | What it sets                       |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------------- |
| `--ft-tabs-indicator-color`    | `--ft-nav-accent` (underline), `--color-accent` (segmented) | The bar's or the pill's fill       |
| `--ft-tabs-indicator-duration` | `--ft-duration-fast` (`150ms`)                              | How long the slide takes           |
| `--ft-tabs-indicator-ease`     | `--ft-ease-inout` (`cubic-bezier(0.4, 0, 0.2, 1)`)          | The slide's curve                  |
| `--ft-tabs-indicator-radius`   | `--radius-md`, falling back to `0.375rem`                   | The segmented pill's corner radius |

`--ft-tabs-indicator-sx` and `--ft-tabs-indicator-sy` also appear on that
element. They are internal bookkeeping — `TabsList` writes the pill's two scale
factors there on every measurement so the pill's own `border-radius` can divide
its corner back down — not knobs; setting them by hand only distorts the
corners.

`.ft-tabs-trigger-selected` is still on every selected trigger in the underline
variant, but it carries no rules of its own any more. It stays because it is a
published styling hook, and removing it from the class string would silently
break a consumer targeting it.

## Motion

One `aria-hidden` bar slides between tabs instead of blinking on under each one
in turn. `TabsList` measures the selected trigger and writes a single
`transform` — `translate()` to put the bar at that trigger, `scale()` to
stretch it to that trigger's size — so nothing about the rail relayouts while
the selection walks along it with the arrow keys. The slide runs for 150 ms
(`--ft-duration-fast`) on `--ft-ease-inout`, not `--ft-ease-out`: selecting a
tab is a reversible flip between two resting places, not an arrival, so it
eases out of the old tab as much as into the new one.

In the `underline` variant the bar _is_ the 2px accent rule along the list's
bottom edge — its inline-start edge when vertical. In the `segmented` variant
it is the pill itself, stretched to the selected trigger's whole box on both
axes.

It snaps rather than slides the first time it is placed — including the case
where nothing was selected at mount and the reader's first click is what places
it — on a resize, and whenever `orientation` or `variant` changes. A bar has to
_travel_ between two places for the travel to mean anything, and none of those
is a journey: with no previous place to leave from, a tween would fly the bar
in from the list's own corner.

The bar is a progressive enhancement, never the only selection signal: the
selected trigger keeps `aria-selected="true"` and its own foreground colour. A
screen reader (the bar has no role and is never announced), a Windows High
Contrast user (where it repaints as `Highlight`, and the selected `segmented`
label as `HighlightText`) and a server-rendered page with JavaScript disabled
all still see which tab is active.

The panel that arrives fades in, over 150 ms (`DURATIONS.fast`) on
`JS_EASINGS.out` — opacity only, and an entrance only. The panel being left cuts
away in the same tick it stops being selected: `TabsContent` instances are
siblings the caller places by hand, so an outgoing panel has nowhere to be
stacked, and a true cross-fade would mean wrapping every caller's content in a
layer element to get one. The hard cut on arrival was the part that read as a
jolt, and it is the part that is fixed. With `forceMount` every panel is mounted
permanently and the fade never plays after the first render — `forceMount`
exists to keep panels alive, and a `hidden` attribute flip is not something that
can be animated. A panel that is already selected at first render simply
appears, with no fade.

- **Reduced motion** — the bar still tracks the selection, it just arrives
  without the tween. Both halves agree: the CSS `transition` is declared inside
  `@media (prefers-reduced-motion: no-preference)`, and `TabsList` snaps its own
  writes when the preference is set, so neither half can drift into animating
  alone. The panel fade collapses to `duration: 0` under the same preference,
  which makes Svelte skip `element.animate()` outright — the panel is simply
  there.
- **Touch and coarse pointers** — unchanged; nothing here is pointer-gated. The
  bar moves on selection regardless of input modality.
- **RTL** — no branch, and none needed. `offsetLeft` is a physical offset from
  the list's left edge in both directions and the bar's `transform-origin` is
  physical to match, so the arithmetic lands correctly under `dir="rtl"`
  unchanged. Do not restyle the indicator onto a logical `inset-inline-start`:
  that moves the origin while the measurement stays physical, and the bar lands
  mirrored.
- **Forced colors** — a forced-colors palette replaces every author background
  with a system colour, so the bar re-states its fill as one of that palette's
  own keywords (`Highlight`) or it would disappear entirely. In the `segmented`
  variant that fill sits _under_ the selected label, whose colour the same
  palette forces independently to `ButtonText`, so the label re-states itself as
  `HighlightText` — the partner the palette guarantees contrast against. The
  `underline` variant needs no such pairing: its bar sits on the list's edge,
  not under a label.
- Retiring the old per-trigger underline also freed `TabsTrigger`'s focus ring,
  which used to share one `box-shadow` declaration with the accent bar. It is
  now the only `box-shadow` on the element, and it is never part of a
  transition — a focus ring that fades in reads as lag, not polish.

## Implementation Notes

- The roving-focus registry and the DOM-order re-query on every arrow press
  are the same split `ToggleGroup` uses, for the same reason: registration
  order alone cannot stay correct under a keyed `{#each}` that reorders
  after mounting, so `move`/`moveToEdge` query the live DOM instead of
  trusting it, and registration is only ever used as the pre-interaction
  tabbable fallback.
- `register`/`unregister` run inside `untrack()` for their entire body, not
  just the membership check — `.push()`/`.splice()` also read the `$state`
  array to do their job, and leaving that call itself tracked makes the
  calling `$effect` depend on the very array its own call just mutated,
  alternating register/unregister forever until Svelte throws
  `effect_update_depth_exceeded`. This codebase has already shipped that
  loop once.
- `activation="automatic"` selects from inside `Tabs`'s own `move`/
  `moveToEdge` (by way of the shared `goTo` helper), not from
  `TabsTrigger`'s keydown handler — one place decides whether arrowing
  activates, rather than every trigger needing to ask.
- `TabsTrigger` adds no keydown handling for Enter or Space: a native
  `<button>` already fires a `click` event for both, and `handleClick`
  selects — so manual activation's "confirm with Enter/Space" falls out of
  browser behavior for free, without a duplicate code path.
- Reclaiming focus when the focused, selected trigger becomes disabled
  splits detection from action across an `$effect.pre` and a regular
  `$effect`, rather than doing both in one place. `$effect.pre` runs before
  Svelte patches the DOM for that flush, so `document.activeElement` there
  still reflects the _previous_ render's focus; a regular `$effect` can
  already be too late, since a real browser force-blurs a focused control
  to `<body>` as part of applying the very `disabled` attribute change that
  effect is reacting to. jsdom does not reproduce that forced blur — it
  leaves focus sitting on the disabled control instead (see
  `_internals/menu.svelte.ts`'s note on the same limitation for the menu
  focus core) — but the fix does not depend on _when_, or whether, the blur
  happens: `$effect.pre` captures "did this trigger hold focus right before
  this disable landed" as a plain boolean, and the regular `$effect` below
  it acts on that boolean unconditionally, once, after the roving registry
  has already been updated. Both `wasDisabled` (transition tracking) and
  `hadFocusBeforeDisabling` (the captured flag) are plain variables, not
  `$state` — nothing outside these two effects needs to react to either.
- The guard on `hadFocusBeforeDisabling` is not redundant with
  `focusedValue`'s own "prefer the still-registered `focusedValueState`"
  fallback. Without it, disabling _any_ trigger — even one that never held
  DOM focus — would still call `focusElement` on whatever `focusedValue`
  currently resolves to, which is normally harmless (re-focusing an already-
  focused element is a no-op) but stops being harmless the moment DOM focus
  has moved somewhere outside the tablist entirely while the roving position
  stayed pointed at a tab from an earlier interaction. In that specific
  case, skipping the guard would yank focus back into the tablist from
  wherever the user actually is — the regression this guard exists to rule
  out.
- The selection's _shape_ is drawn once, by `TabsList`, and not at all by
  `TabsTrigger`. That split is what lets it slide: a per-trigger background or
  `inset` box-shadow can only ever blink from one trigger to the next. It also
  retired a wart — the underline and the focus ring used to be two
  `box-shadow`s on the same element, and two `box-shadow` rules on one element
  cannot both apply (the more specific simply wins and the other disappears),
  so a trigger that was selected _and_ keyboard-focused needed the two
  composited into a single declaration. There is one `box-shadow` on a trigger
  now.
- The indicator is measured with `offsetLeft`/`offsetTop`/`offsetWidth`/
  `offsetHeight` against `TabsList`'s own padding box — the list is
  `position: relative`, so it is every trigger's `offsetParent`, and the bar's
  `left: 0; top: 0` shares that same origin. That shared origin is what removes
  every fudge factor from the arithmetic; the segmented rail's 3px padding, for
  one, simply falls out of the measurement. A zero measurement is read as "not
  laid out yet" and leaves the bar hidden, rather than collapsing it into a
  0-wide sliver parked at the origin.
- A snap suspends the transition around the write and forces a reflow between
  the two: `transition: none` → write the transform → read `offsetWidth` →
  restore. Without that forced read the browser coalesces all three writes into
  one style recalculation and the "snap" tweens anyway.
- The list's `ResizeObserver` lives in its own `$effect`, keyed to the list
  element alone rather than to the selection. A `ResizeObserver` delivers a
  callback as soon as `observe()` runs, so an observer torn down and
  re-established on every tab change would fire immediately after the tween's
  write and snap the bar back before it had moved.
- `will-change: transform` is set only for the length of a slide and dropped
  again by a timer keyed to the same token the CSS transition uses.
  `transitionend` would be the honest signal, but jsdom never fires one, and a
  compositor hint left on permanently costs a permanent layer for a bar that
  moves a handful of times a session.
- The segmented rail's `bg-background` (not `bg-muted`) repeats
  `ToggleGroup`'s exact reasoning: this app's dark theme has `--muted`
  _lighter_ than `--card`, so a muted fill on a card-nested rail would read
  as raised instead of the mockup's recessed strip.
