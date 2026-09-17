# Button

The library's foundational push-button: six variants, three sizes, a loading state, and a polymorphic anchor mode — the primitive most other interactive components either wrap or model themselves on.

## Usage

```svelte
<script lang="ts">
	import { Button } from "fancy-ui-svelte";
</script>

<Button variant="primary" onclick={() => console.log("clicked")}>Save changes</Button>
```

```svelte
<!-- Sizes -->
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

```svelte
<!-- Loading: cross-fades the leading icon into a spinner, keeps the button's own colours -->
<Button loading={saving} onclick={save}>Save changes</Button>
```

```svelte
<!-- Icons either side of the label -->
{#snippet plus()}
	<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M12 5v14M5 12h14" />
	</svg>
{/snippet}

<Button iconStart={plus}>New project</Button>
```

```svelte
<!-- href renders an <a> instead of a <button>; target="_blank" always gets a safe rel -->
<Button href="https://example.com" target="_blank">Open docs</Button>
```

```svelte
<!-- Icon-only: no visible label, so `label` supplies the accessible name -->
<Button size="sm" label="Close" onclick={close}>
	<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M18 6 6 18M6 6l12 12" />
	</svg>
</Button>
```

## Props

| Prop        | Type                                                                            | Default     | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `variant`   | `"primary" \| "secondary" \| "outline" \| "ghost" \| "accent" \| "destructive"` | `"primary"` | Visual treatment                                                               |
| `size`      | `"sm" \| "md" \| "lg"`                                                          | `"md"`      | Padding / font-size / radius scale                                             |
| `type`      | `"button" \| "submit" \| "reset"`                                               | `"button"`  | Native `type`; ignored once `href` renders an anchor instead                   |
| `disabled`  | `boolean`                                                                       | `false`     | Greys the button out and blocks activation                                     |
| `loading`   | `boolean`                                                                       | `false`     | Spinner in place of `iconStart`, `aria-busy`, inert to activation — no dimming |
| `href`      | `string`                                                                        | —           | Renders an `<a>` instead of a `<button>` when set                              |
| `target`    | `string`                                                                        | —           | Anchor `target`. `"_blank"` forces a safe `rel`                                |
| `rel`       | `string`                                                                        | —           | Anchor `rel`, widened rather than replaced when `target="_blank"`              |
| `fullWidth` | `boolean`                                                                       | `false`     | Stretches the button to its container's width                                  |
| `label`     | `string`                                                                        | —           | Accessible name for a button whose content is icon-only                        |
| `onclick`   | `(event: MouseEvent) => void`                                                   | —           | Fires on activation; never called while `disabled` or `loading`                |
| `iconStart` | `Snippet`                                                                       | —           | Rendered before the label; replaced by the spinner while `loading`             |
| `iconEnd`   | `Snippet`                                                                       | —           | Rendered after the label                                                       |
| `children`  | `Snippet`                                                                       | —           | The button's label / content                                                   |
| `class`     | `string`                                                                        | —           | Additional CSS classes                                                         |
| `ref`       | `HTMLButtonElement \| HTMLAnchorElement \| null`                                | `null`      | Bindable element reference                                                     |
| `sound`     | `boolean`                                                                       | `false`     | Plays the `press` cue on activation, once the user has enabled sound           |

## Theming

Five of the six variants read the theme's own `primary` / `secondary` / `border` / `accent` / `destructive` tokens, so they follow whatever palette the page already declares. `accent` is the exception: the brand purple has no semantic Tailwind token, so it is a scoped CSS custom property with a `light-dark()` fallback instead:

```svelte
<div style="--ft-accent: oklch(0.6 0.2 290)">
	<Button variant="accent">Upgrade</Button>
</div>
```

`--ft-accent-foreground` (default `oklch(1 0 0)`, plain white) colours its label the same way. Both are inherited, so setting either anywhere up the tree — a wrapper's `style`, a theme class, `:root` — retints every accent button below it, and the same `--ft-accent` also colours every button's focus ring, whatever its variant.

## Sound

Set `sound` to play the `press` cue on activation, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<Button sound onclick={save}>Save changes</Button>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the button **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `disabled` and `loading` block the cue exactly like they block `onclick` — nothing plays for a click that never fires the callback either.

## Motion

- **The lead slot cross-fades.** `iconStart` and the spinner share one fixed-size cell — `calc(1em + 1px)`, the same box the spinner already drew itself in, so it follows the size variant for free. Flipping `loading` fades one out while the other fades in, over the same 80 ms, in place. Both are mounted at once for the length of that fade; the cell never resizes, so the label beside it never shifts. A button that starts out `loading` renders its spinner immediately, with no fade in from nothing, and a button given neither a spinner nor an `iconStart` renders no cell at all.
- **Pressing scales the button to `0.97`** for as long as it is held, over 150 ms on `--ft-ease-inout` — the reversible-state curve, because a press resolves either way. A disabled button and a `loading` one are both excluded: a press that does nothing should not pretend to.
- The press transition lists `transform` and the three colour properties, and deliberately never `box-shadow`. This button's focus ring _is_ a `box-shadow` (`focus-visible:ring-*` compiles to one), and a focus ring must never animate.
- **Reduced motion.** The press scale is declared entirely inside `@media (prefers-reduced-motion: no-preference)`; without that preference the button simply does not move, and the resting state is the ungated fallback. The lead cross-fade collapses to a duration of `0`, which makes the swap synchronous — exactly the instant cut this button did before the fade existed. The spinner's own rotation is likewise gated, and with motion reduced the ring is still drawn, just still, so `aria-busy` keeps a visible companion. Colour is the one channel that stays ungated in both places: a colour change is not motion, and gating it would only make a theme flip look broken for the people who asked for less movement.
- **Touch and coarse pointers.** `:active` is exactly the affordance a finger gets, so the press feedback is not suppressed on touch. The button carries `touch-action: manipulation`, which removes the browser's ~300 ms tap delay without blocking scrolling — a button inside a scrollable list stays scrollable while it press-reacts.
- **Timing.** 80 ms, linear, for the lead cross-fade (a fade needs no curve); 150 ms, `--ft-ease-inout` (`cubic-bezier(0.4, 0, 0.2, 1)`), for both the press scale and the colour channel beside it.

## Implementation notes

- `href` switches the rendered element from `<button>` to `<a>` — the two share one class list and one `onclick` guard, so behaviour does not fork with the markup.
- An anchor cannot be `disabled`, and half its activation paths — middle-click firing `auxclick`, "open link in new tab" from the context menu — act on `href`/`target` directly and never reach `onclick` at all. So `disabled` and `loading` are combined into one `anchorInert` flag that strips `href` and `target`, sets `aria-disabled="true"` and `tabindex="-1"`; the click handler still swallows the event too, as a second line of defence for whatever does reach it. `loading` alone must be just as inert as `disabled` — a caller can't tell those attack surfaces apart, so the fix can't either.
- `loading` is deliberately not `disabled` — the mockup keeps a loading button at full strength (no dimming), because "working" and "unavailable" read as different things. On the button branch this falls out naturally: `loading` never touches the native `disabled` attribute, so `disabled:opacity-50` never triggers, and the shared click guard is what actually stops the callback (proven by a synthetic dispatch that bypasses jsdom's own disabled handling in the test suite). On the anchor branch, `aria-disabled` goes true for `loading` too — inertness has to be visible to assistive tech regardless of _why_ the link is inert — but the dimmed look stays tied to `disabled` alone through a separate `data-disabled` attribute, so a loading anchor reads as busy, not unavailable, exactly like a loading button does.
- `target="_blank"` always widens `rel` to include `noopener noreferrer`, on top of whatever tokens the caller already passed, closing the `window.opener` reverse-tabnabbing hole even when a caller forgets.
- The spinner reads its own `font-size` (`calc(1em + 1px)`), so its diameter follows the size variant automatically rather than needing a per-size override; its top edge is `currentColor` and the rest of the ring is `currentColor` at 30% via `color-mix`, so it always matches whichever variant it is drawn on. See [Motion](#motion) for the spin's reduced-motion gate.
- `aria-hidden` sits on the lead cell rather than on the spinner inside it, so it covers the whole cell for the length of the cross-fade: mid-swap the outgoing icon is still mounted, and a screen reader has no business reading a glyph on its way out of a control already marked `aria-busy`. With `loading` false the cell carries no `aria-hidden` at all, so a caller's own `iconStart` markup keeps whatever accessible treatment the caller gave it.
- The `transition-colors` utility is deliberately absent from the class string. Svelte's scoped `<style>` is unlayered and Tailwind's utilities live in `@layer utilities`, so the scoped `transition` shorthand this button needs (the press scale has to join the colour channel) would win over that utility silently and leave a colour transition that never ran. The colour channel is re-declared by hand instead, at exactly the values the utility resolved to.
