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

The segmented rail's fill uses `bg-background`/`border-border`, and the
selected segmented pill uses `bg-accent`/`text-accent-foreground` — all
follow whatever a consumer's theme already says for those tokens. The
underline bar and the focus ring have no semantic token in the app's theme
layer, so both fall back to a `light-dark()` accent pair, declared once on
`Tabs`'s own root and read by `TabsTrigger` below it:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

Set `--ft-accent` higher up the tree to retint the underline and the focus
ring on every `TabsTrigger` beneath it — the same variable `ToggleGroup` and
`Toggle` already key off of, so one override retints all three.

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
- The underline's `box-shadow` and the focus ring's `box-shadow` are
  composited into one declaration when a trigger is both selected and
  keyboard-focused (`.ft-tabs-trigger-selected:focus-visible`) — two
  separate `box-shadow` rules on the same element cannot both apply; the
  more specific one simply wins and the other disappears.
- The segmented rail's `bg-background` (not `bg-muted`) repeats
  `ToggleGroup`'s exact reasoning: this app's dark theme has `--muted`
  _lighter_ than `--card`, so a muted fill on a card-nested rail would read
  as raised instead of the mockup's recessed strip.
