# StatusMorph

A 1em SVG status icon that morphs between idle, loading, success, and error —
a ring that spins while loading, then closes and draws itself into a check or
a cross. Built from five always-present SVG shapes (never conditionally
mounted), so every transition animates smoothly and nothing shifts layout.

## Usage

```svelte
<script>
	import { StatusMorph } from "fancy-ui-svelte";
	let state = $state("idle");

	async function save() {
		state = "loading";
		try {
			await doSave();
			state = "success"; // auto-resets to idle after 1.8s
		} catch {
			state = "error";
		}
	}
</script>

<button onclick={save}>
	<StatusMorph bind:state />
	Save
</button>
```

### The Button composition (frozen)

`Button.svelte` is never modified, and the recipe below is intentional, not a
workaround:

```svelte
{#snippet icon()}
	<StatusMorph bind:state />
{/snippet}

<Button loading={state === "loading"} iconStart={icon}>Save changes</Button>
```

(The snippet is declared at the top level on purpose: a `{#snippet}` written
_inside_ `<Button>` would be passed to Button as a prop named `icon` rather
than bound to a local identifier, so `iconStart={icon}` would not see it.)

Read against Button's own template, `iconStart` is unreachable while
`loading` is true — Button's native `.ft-btn-spinner` covers the entire
loading phase, and StatusMorph's `iconStart` slot only ever mounts once
`state` has already become `"success"` or `"error"`. In this composition,
**StatusMorph's own loading ring and its ring-close-into-check morph never
play** — StatusMorph mounts already in its final state, so its
`stroke-dashoffset` draw transitions have no prior value to run from. What
actually plays, over an already-drawn glyph, is the check's overshoot pop (or
the error shake) — a hard cut from Button's spinner, not a continuous morph.
This is correct and intentional: it keeps Button's own `aria-busy` and
click-guard untouched. The full, continuous ring→check→settle morph is
reserved for **standalone** usage — a save-status dot, a sync icon, anywhere StatusMorph
isn't riding inside `Button.loading`.

## Props

| Prop         | Type                                                     | Default                                                    | Description                                                               |
| ------------ | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `state`      | `"idle" \| "loading" \| "success" \| "error"` (bindable) | `"idle"`                                                   | Current state. External writes are always honoured                        |
| `resetAfter` | `number`                                                 | `1800`                                                     | ms until auto-reset to `idle` after success/error; `0` disables the timer |
| `labels`     | `{ loading?: string; success?: string; error?: string }` | `{ loading: "Loading", success: "Done", error: "Failed" }` | Live-region text per state; unset keys fall back to the defaults          |
| `tone`       | `"current" \| "semantic"`                                | `"current"`                                                | `currentColor` everywhere, or the AI-family `--ft-status-*` vocabulary    |
| `haptic`     | `boolean`                                                | `false`                                                    | Best-effort vibration on entering success/error                           |
| `idle`       | `Snippet`                                                | —                                                          | Custom idle content, same footprint as the default transparent scaffold   |
| `class`      | `string`                                                 | —                                                          | Additional CSS classes                                                    |
| `ref`        | `HTMLSpanElement \| null` (bindable)                     | `null`                                                     | Bound reference to the root element                                       |

## Theming

| CSS var                    | Fallback                                             | Meaning                       |
| -------------------------- | ---------------------------------------------------- | ----------------------------- |
| `--ft-statusmorph-track`   | `color-mix(in oklab, currentColor 30%, transparent)` | Ring track colour, both tones |
| `--ft-statusmorph-loading` | `var(--ft-status-running, …)` (semantic tone only)   | Loading ring colour           |
| `--ft-statusmorph-success` | `var(--ft-status-done, …)` (semantic tone only)      | Success ring/check colour     |
| `--ft-statusmorph-error`   | `var(--ft-status-error, …)` (semantic tone only)     | Error ring/cross colour       |

`tone="current"` ignores the three colour vars above entirely — every glyph
paints in `currentColor`. Set `tone="semantic"` to read the shared AI-family
status vocabulary instead:

```svelte
<StatusMorph bind:state tone="semantic" />
```

Each `--ft-status-*` default is a `light-dark()` pair, because no single token
clears 4.5:1 against both white and near-black. Which half applies is decided
by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

## Motion

- **Reduced motion.** Every transition and `@keyframes` rule lives inside
  `@media (prefers-reduced-motion: no-preference)`. Outside it, each shape's
  opacity, `stroke-dasharray`, and `stroke-dashoffset` are already the final
  glyph for `idle`, `success` and `error` — reduced motion shows it instantly,
  with nothing to override. The one state without a meaningful static
  equivalent is `loading`: the ring holds a static quarter-arc instead of
  spinning, so under reduced motion the live region (and, in the Button
  composition, Button's own `aria-busy`) is what actually communicates that
  work is in progress.
- **Touch and coarse pointers.** Nothing here is pointer-driven.
- **Timing.** Loading ring: `0.8s linear infinite` spin, matching
  `Button`'s own spinner exactly. Success: the ring closes in `200ms`
  (`--ft-ease-in`), the check draws in `300ms` (`--ft-ease-out`, `80ms`
  delay) and pops past `scale(1)` with `--ft-ease-overshoot` — the one
  overshoot consumer in the family. Error: the ring closes the same `200ms`,
  the cross draws as two `160ms` strokes staggered `80ms` apart, and the
  whole icon shakes `±2px` over `300ms`.

## Accessibility

- A single, persistent live region (`role="status"`, `aria-live` toggling
  `polite`/`assertive` for the error case) is mounted unconditionally from
  first render and portalled to `document.body` via `use:portal` — never
  conditionally per state, so assistive tech reliably announces every change
  **in standalone usage**. In the Button composition above, Button unmounts
  `iconStart` for the entire loading phase, so the live region itself is
  re-created at success/error with its text already present — a live region
  that appears together with its content is not reliably announced by every
  AT. Keep Button's own `aria-busy` and click-guard as the authoritative
  loading signal there, and prefer standalone usage wherever the success/error
  outcome specifically must be announced.
- **Why portal, concretely:** the native accessible-name computation for a
  `<button>` concatenates the text of every non-`aria-hidden` descendant. If
  this live region weren't portalled and StatusMorph were rendered as a
  `Button`'s `iconStart`, a screen-reader user would hear "Loading Save
  changes" instead of "Save changes" — the transient status text bleeding
  into the button's identity, re-announced on every focus.
- **Portalling into a modal.** The portal always targets `document.body`. If
  StatusMorph is used inside a dialog (e.g. a "Save" button in a modal), the
  live region lands outside that dialog's `aria-modal="true"` subtree, which
  several AT/browser pairs prune from the accessibility tree entirely while
  the dialog is open — the announcement may not be heard at all in that case.
- The SVG itself is `aria-hidden="true"`; all five shapes are purely
  decorative, the live region is the only thing assistive tech hears.

## Implementation notes

- **Cleanup.** The `resetAfter` timer lives in a plain `$effect` keyed on
  `state` (and `resetAfter`): Svelte tears down the previous run's
  `setTimeout` before the effect body reruns for a new value, so any state
  change — internal or external — cancels a stale timer for free, and the
  same teardown fires on unmount. The haptics effect keeps a plain (non-
  reactive) record of the last state it fired for, so it buzzes on
  TRANSITION into success/error rather than on every run where `haptic` is
  true — no timer or listener involved, so it needs no explicit teardown.
- **SSR.** The portalled live region is a client-only action, so during SSR
  it renders inline in its natural DOM position instead of under
  `document.body` — this is fine, and gets moved on mount.
