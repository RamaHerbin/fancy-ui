# Copy Button

A button that writes a value to the clipboard, and says so — the icon draws a
check, the label swaps to a success skin for a moment, then everything settles
back. A copy that fails says so too, with a drawn cross and its own label,
instead of looking exactly like one that worked.

## Components

- `CopyButton` - A `Button` preset wired to the clipboard, morphing its icon
  and label to a success or failure state for a moment after each copy attempt

## Usage

```svelte
<script>
	import { CopyButton } from "fancy-ui-svelte";
</script>

<CopyButton value="npm install fancy-ui-svelte" />
```

Icon-only, for a toolbar:

```svelte
<CopyButton value={snippet} iconOnly label="Copy snippet" />
```

React to the outcome instead of trusting the label alone:

```svelte
<script>
	import { CopyButton } from "fancy-ui-svelte";

	function onCopy(value, ok) {
		if (!ok) console.warn("Clipboard write failed for", value);
	}
</script>

<CopyButton value="npm install fancy-ui-svelte" {onCopy} />
```

A failed copy is a first-class state, not just a `false` in the callback: it
shows, announces, and localises through `errorLabel` exactly the way a
successful one does through `copiedLabel`.

```svelte
<CopyButton
	value="npm install fancy-ui-svelte"
	copiedLabel="Copié"
	errorLabel="Échec de la copie"
	label="Copier"
/>
```

## Props

| Prop          | Type                                             | Default         | Description                                                               |
| ------------- | ------------------------------------------------ | --------------- | ------------------------------------------------------------------------- |
| `value`       | `string`                                         | —               | The text written to the clipboard on activation (required)                |
| `label`       | `string`                                         | `"Copy"`        | Idle label                                                                |
| `copiedLabel` | `string`                                         | `"Copied"`      | Label shown for `resetMs` after a successful copy                         |
| `errorLabel`  | `string`                                         | `"Copy failed"` | Label and announcement shown for `resetMs` after a failed copy            |
| `resetMs`     | `number`                                         | `2000`          | How long the copied state holds before reverting, in milliseconds         |
| `variant`     | `ButtonVariant`                                  | `"outline"`     | Passed straight through to the underlying `Button`                        |
| `size`        | `ButtonSize`                                     | `"md"`          | Passed straight through to the underlying `Button`                        |
| `disabled`    | `boolean`                                        | `false`         | Disables the button and blocks the copy                                   |
| `iconOnly`    | `boolean`                                        | `false`         | Drops the visible label, moving it to `aria-label` instead                |
| `onCopy`      | `(value: string, ok: boolean) => void`           | —               | Called with the value and whether the write actually succeeded            |
| `children`    | `Snippet`                                        | —               | Overrides the default icon + label content                                |
| `class`       | `string`                                         | —               | Additional CSS classes                                                    |
| `ref`         | `HTMLButtonElement \| HTMLAnchorElement \| null` | `null`          | Bindable element reference — matches `Button`'s own ref type              |
| `sound`       | `boolean`                                        | `false`         | Plays `copy`/`error` on the copy outcome, once the user has enabled sound |

## Theming

| Variable            | Default                                                            | Applies to                                                                                         |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `--ft-status-done`  | `light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145))`            | The copied skin's border, background wash and text, and the check glyph                            |
| `--ft-status-error` | `light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))` | The failed skin's border, background wash and text, and the cross glyph — one red, declared or not |

Both are the library's own "operation landed" / "operation failed" vocabulary
— the same tokens `ToolCall`, `ToolTimeline`, `AgentPlan`, `SubagentList`,
`CodeDiff`, `ApprovalCard`, `AiDataTable`, `TerminalBlock`,
`RecommendationCard` and `Toast` all read. Retint one once and every success —
or every failure — surface in a consumer's theme, `CopyButton` included, moves
together:

```css
.my-toolbar {
	--ft-status-done: oklch(0.6 0.17 145);
	--ft-status-error: oklch(0.6 0.22 27);
}
```

The skin and the glyph inside it resolve `--ft-status-error` through the same
chain, including when neither it nor a theme is present: `CopyButton` hands
`StatusMorph` the failure red explicitly, so the cross and the border around it
are the same colour out of the box rather than two neighbouring reds. Setting
`--ft-status-error` still wins on both.

Both defaults are `light-dark()` pairs, so **your theme must declare
`color-scheme`** for the right half to be picked:

```css
:root {
	color-scheme: light dark;
}
```

## Motion

The icon is a `StatusMorph`, so a copy attempt is one continuous gesture rather
than a pixel-swap: the copy glyph gives way to a ring that closes in `200ms`
(`--ft-duration-exit`, `--ft-ease-in`), then the outcome is **drawn** — a check
over `300ms` (`--ft-duration-base`, `--ft-ease-out`) after an `80ms`
(`--ft-duration-micro`) beat, or a cross as two `160ms` strokes staggered one
beat apart, with a `±2px` shake. The button's own border, background and text
cross-fade to the matching skin on Tailwind's colour clock, which is already
`150ms` / `--ft-ease-inout`.

- **Reduced motion** — every one of those rules lives inside
  `@media (prefers-reduced-motion: no-preference)` in `StatusMorph`'s own
  stylesheet. Outside it the final glyph is simply there, instantly and
  completely; the colour swap is not gated, because a colour change is not
  motion. Nothing about what the button says or announces depends on the
  animation.
- **Touch and coarse pointers** — unchanged; nothing here is pointer-driven.
  Haptics are deliberately not wired through: `StatusMorph` has them, and
  opting in would be a second new prop for a second reason.
- **Timing knob** — the whole outcome window is `resetMs`, which drives the
  glyph and the skin from the same value. It is read once, at mount. `0` means
  "revert immediately", for the glyph as well as the label — the two halves are
  held to the same reading of the prop.

## Sound

Set `sound` to play a cue on the copy outcome, through the shared sound controller (see [`sound/README.md`](../sound/README.md)): `copy` when the write succeeds, `error` when it does not.

```svelte
<CopyButton value="npm install fancy-ui-svelte" sound />
```

It is opt-in and silent by default, and it is not simply forwarded to the inner `Button` — the inner button stays quiet so a click only ever plays one cue, not `press` followed by `copy`/`error`.

## Implementation Notes

- Wraps `Button` rather than reimplementing its geometry, variants, disabled
  state, and focus ring — `variant`/`size`/`disabled` are forwarded as-is, so
  a `CopyButton` picks up any future change to `Button` automatically.
- Copy state is owned by `createCopy` (`../_internals/clipboard.svelte.js`),
  the shared helper any future copy affordance should reach for rather than
  re-implementing the timer — `CopyButton` is its first consumer. `copy()`
  resolves `false` instead of throwing when the clipboard API is missing or
  the write is denied, and `onCopy` reports that outcome honestly — the
  button does not claim success it did not get, and since this pass it does
  not stay silent about it either.
- `resetMs` configures the helper's timer once, at construction, matching how
  the helper itself takes it as a constructor argument rather than a
  reactive input; changing the prop after mount has no effect on an
  already-running button.
- The icon slot is a `StatusMorph` with `tone="semantic"` and the copy glyph
  handed to its `idle` snippet, which is where the check draw, the cross draw
  and the announcement all come from — none of it is reimplemented here. It is
  sized by an inline `style` rather than a `size-4` class on purpose: Tailwind
  utilities are layered and `StatusMorph`'s own scoped sizing rule is not, so
  a utility would lose to it. The `font-size` set alongside the width is what
  makes `StatusMorph`'s inner `calc(1em + 1px)` land on the same `1rem`, so
  the glyph fills the icon footprint exactly instead of sitting short of it.
- The announcement is `StatusMorph`'s single `role="status"` region, portalled
  to `document.body` so its text never joins the button's accessible name, and
  upgraded from `polite` to `assertive` for the failure case. `CopyButton` no
  longer mounts one of its own: two live regions would announce every copy
  twice. The one exception is a custom `children`, which replaces the icon
  slot and therefore leaves no `StatusMorph` at all — there the label span
  keeps `aria-live`, because a custom snippet has no way of its own to say the
  copy landed and colour alone is a sighted-only signal.
- Two windows, one number. `createCopy` owns `copied` (the skin and the
  label); `StatusMorph` owns the glyph and resets itself. Both are armed in
  the same tick from the same `resetMs`, read once at mount, so they never
  disagree — and a repeat click clears the glyph back to idle before the new
  attempt, so a second copy inside the first window re-arms both rather than
  restarting only the skin.
- The success and failure skins (border, background wash, text colour) are
  applied through `:global()` selectors, not normal scoped ones: the classes
  land on the `<button>`/`<a>` that `Button` renders inside its own template,
  which is outside `CopyButton`'s scoped tree.
- Passing `children` replaces the built-in icon and visible label; both skins,
  the disabled/copy wiring, and the announcement above all still apply. Set
  `iconOnly` alongside it if the custom content has no readable text, so the
  button keeps an accessible name.
