# TextRoll

A single-line text value that rolls to its new content per grapheme —
odometer-style — whenever `value` changes. There is no `trigger` prop: the
very first render is always a plain, non-animated text node, and every
animation after that is driven purely by `value` changing under the
component's feet.

## Usage

```svelte
<script>
	import { TextRoll } from "fancy-ui-svelte";

	let period = $state<"monthly" | "yearly">("monthly");
	let price = $derived(period === "monthly" ? "$29" : "$290");
</script>

<button onclick={() => (period = period === "monthly" ? "yearly" : "monthly")}>
	Switch to {period === "monthly" ? "yearly" : "monthly"}
</button>

<TextRoll value={price} tabular />
```

### A live ticker

```svelte
<script>
	import { TextRoll } from "fancy-ui-svelte";

	let count = $state(0);
	$effect(() => {
		const id = setInterval(() => (count += 1), 1000);
		return () => clearInterval(id);
	});
</script>

<TextRoll value={String(count)} tabular direction="up" />
```

`direction="auto"` (the default) already resolves to `"up"` for this case —
pass an explicit `direction` only when you want to override what the numeric
comparison would decide, or when `value` isn't numeric at all.

## Props

| Prop        | Type                                      | Default   | Description                                                                                                                                                                                |
| ----------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value`     | `string`                                  | required  | The text to display. A change after mount triggers a per-grapheme roll to the new value.                                                                                                   |
| `direction` | `"auto" \| "up" \| "down"`                | `"auto"`  | Which way the cells travel. `"auto"` compares the trimmed old/new values as numbers (up for an increase); a tie, a non-numeric change, or an empty side falls back to `"up"`.              |
| `duration`  | `number` (ms)                             | `300`     | Roll duration. Collapsed to `0` under reduced motion (synchronous swap). The hard-timeout backstop (see Implementation notes) scales with this, so a longer `duration` is never cut short. |
| `stagger`   | `number` (ms)                             | `15`      | Per-cell delay step, before compression to a `200ms` total (see Motion). Collapsed to `0` under reduced motion.                                                                            |
| `from`      | `"first" \| "last" \| "center" \| number` | `"first"` | Stagger origin.                                                                                                                                                                            |
| `tabular`   | `boolean`                                 | `false`   | `font-variant-numeric: tabular-nums` on **both** layers — locks digit advance width so the real and cell layers never drift apart.                                                         |
| `live`      | `"off" \| "polite" \| "assertive"`        | `"off"`   | Puts the matching `role`/`aria-live` pair on the real (unsplit) text layer only. Off by default — see Accessibility.                                                                       |
| `class`     | `string`                                  | —         | Additional CSS classes, merged onto the root.                                                                                                                                              |
| `ref`       | `HTMLSpanElement \| null` (bindable)      | `null`    | Bound reference to the root element.                                                                                                                                                       |

Any other standard `<span>` attribute (`id`, `data-*`, `aria-*`, …) is passed
through to the root.

## Theming

| CSS variable             | Default | Applies to                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--ft-textroll-duration` | `300ms` | A public theming/introspection hook mirroring the `duration` prop. Informational only — the roll itself reads `duration` as a plain JS number, never this var, so overriding it here changes nothing visually. The component declares this var on `.ft-textroll` itself, so a value set on an ancestor (`:root`, a section wrapper) does not reach it — set it on `.ft-textroll` (or a more specific selector) directly if a consumer's own CSS wants to read it back. |
| `--ft-textroll-distance` | `1em`   | The `translateY` travel distance both `rollIn` and `rollOut` animate across. Not exposed as a prop — set this var on `.ft-textroll` from your own CSS to change how far a cell travels.                                                                                                                                                                                                                                                                                |

## Motion

- **Reduced motion**: `prefers-reduced-motion: reduce` collapses both
  `duration` and `stagger` to `0` — a synchronous swap, not an instant version
  of the same animation. `tabular` still applies; only the motion is removed.
- **Touch and coarse pointers**: nothing here is pointer-driven — TextRoll
  reacts only to the `value` prop changing, identically regardless of input
  type.
- **Timing**: `300ms` (`--ft-duration-base`) per cell, `--ft-ease-out` on the
  way in and `--ft-ease-in` on the way out — an entering cell arriving reads
  differently from a leaving cell continuing its exit, same as the rest of
  the family. The `15ms`-per-cell stagger is compressed (never clipped) to a
  `200ms` total spread via the shared `staggerDelay` helper, so a long value
  never reads as "still loading" instead of "staggered."
- **Forced colors** (Windows High Contrast): the roll does not play. The
  cell layer is hidden for the duration of `data-state="rolling"` and the
  real layer's text is drawn in `CanvasText` instead — the same instant,
  synchronous swap reduced motion produces, because forced-colors mode has
  no reliable notion of a translucent, mid-transition overlay.

## Accessibility

- The real layer (`.ft-textroll-real`) is the single, unsplit, always-correct
  copy of `value`. `aria-hidden="true"` on the per-grapheme cell layer keeps
  it out of the accessibility tree entirely, so a screen reader's accessible
  name sees `value` exactly once; `user-select: none` on that same layer
  keeps it out of a mouse selection and the clipboard too, so copying the
  rendered text also yields `value` exactly once.
- That per-grapheme cell layer is still real, visible-shaped text sitting in
  the DOM, though — `aria-hidden` and `user-select: none` do not remove it.
  A raw `element.textContent` read, a browser's `Ctrl+F` find, or an in-page
  translator all walk the DOM directly rather than the accessibility tree or
  a selection, so each of them sees `value` a **second** time, once per
  layer. Read from `.ft-textroll-real` directly (not the component's root)
  whenever the authoritative, single copy of `value` is what a consumer's own
  code needs.
- `live="off"` (the default) adds no `role` or `aria-live` at all. A live
  region firing on every tick of a fast-moving counter is worse than silence
  — opt in explicitly with `"polite"` (`role="status"`) or `"assertive"`
  (`role="alert"`) only where each change is genuinely worth announcing (a
  final price after a toggle, not a per-second ticker).
- Keyboard and pointer parity is automatic: there is nothing to focus,
  hover, or press here in the first place — TextRoll is a passive display
  primitive.

## Implementation notes

- **Segmentation**: `Intl.Segmenter(undefined, { granularity: "grapheme" })`
  splits `value` into cells so a combining accent (`é`) or a ZWJ-joined emoji
  family counts as one cell, never a broken half. When `Intl.Segmenter` is
  unavailable, the value is **not** split at all — the whole string
  crossfades as a single cell, never a naive code-unit fallback that would
  corrupt those same cases.
- **Diffing**: a same-length change keys each cell by `index:grapheme`, so a
  cell whose grapheme didn't change keeps its DOM node — only the cells that
  actually changed roll. A length change (e.g. `"9" → "10"`) re-keys every
  cell at once for a full, honest reroll rather than guessing which existing
  cells to reuse positionally.
- **Cleanup**: the in-flight roll count is driven by each cell's
  `onintrostart`/`onintroend`/`onoutrostart`/`onoutroend`, plus an
  unconditional hard timeout backstop in case a transition is interrupted
  mid-flight and never fires its end event. That backstop is at least
  `600ms` (`DURATIONS.entrance`, the family's slowest named duration token)
  but grows past it for a `duration` long enough that the real roll — including
  the worst-case stagger spread — would otherwise still be in flight when the
  backstop fires; the constant never truncates a caller's own `duration`. The
  timer is cleared and re-armed on every value change that actually starts a
  new roll, and on unmount — a `direction`-only change with the same `value`
  does not re-arm it, so it never restarts its countdown over a roll it did
  not start. There is no other listener or observer to tear down.
- **SSR**: the server renders the real layer's plain text and `data-state="idle"`
  — identical to the client's first paint, since the very first render never
  animates. There is no hydration mismatch to guard against.
- **Supported scope**: single-line, short (roughly ≤30-grapheme) labels and
  values — a price, a counter, a status word — set in Latin/Cyrillic/
  Greek-class scripts with a default font that isn't leaning on aggressive
  discretionary ligatures. Pass `tabular` when rolling numbers, so digit
  width stays locked and the two layers never drift apart. Each cell is its
  own isolated inline box, so a joining script (Arabic, and similar) loses
  its contextual letterforms entirely for the roll's duration, and a
  bidi-mixed value is painted in the wrong visual order in the cell layer —
  not merely offset — because per-cell isolation drops bidi reordering
  across cell boundaries. Values in those scripts should not use TextRoll.
