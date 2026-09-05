# Toggle

A two-state button that stays pressed until clicked again — for a single on/off
option like a formatting mark, a filter, or a mute switch.

## Components

- `Toggle` - A `<button>` carrying `aria-pressed`, switching between an idle and a pressed look

## Usage

```svelte
<script>
	import { Toggle } from "fancy-ui-svelte";

	let bold = $state(false);
</script>

<Toggle bind:pressed={bold} label="Bold">
	<strong>B</strong>
</Toggle>
```

Or handle the change yourself instead of binding:

```svelte
<script>
	import { Toggle } from "fancy-ui-svelte";

	function onPressedChange(pressed) {
		console.log("bold is now", pressed);
	}
</script>

<Toggle {onPressedChange} label="Bold">
	<strong>B</strong>
</Toggle>
```

## Props

| Prop              | Type                         | Default   | Description                                                         |
| ----------------- | ---------------------------- | --------- | ------------------------------------------------------------------- |
| `pressed`         | `boolean`                    | `false`   | Whether the toggle is currently pressed (active); bindable          |
| `onPressedChange` | `(pressed: boolean) => void` | —         | Called with the new pressed state whenever the toggle is activated  |
| `disabled`        | `boolean`                    | `false`   | Disables the toggle; blocks both the state change and the callback  |
| `size`            | `"sm" \| "md" \| "lg"`       | `"md"`    | Visual size of the control                                          |
| `variant`         | `"ghost" \| "outline"`       | `"ghost"` | `"ghost"` has no resting border, `"outline"` keeps one at rest      |
| `label`           | `string`                     | —         | Accessible name — required when `children` is icon-only             |
| `children`        | `Snippet`                    | —         | Toggle content, typically a single glyph or a short label           |
| `class`           | `string`                     | —         | Additional CSS classes                                              |
| `ref`             | `HTMLButtonElement \| null`  | `null`    | Bindable element reference                                          |
| `sound`           | `boolean`                    | `false`   | Plays `toggle-on`/`toggle-off` on activation, once sound is enabled |

## Theming

The pressed ring color has no semantic token in the app's theme layer, so it
falls back to a `light-dark()` accent pair local to the component:

```css
.my-toolbar {
	--ft-accent: oklch(0.55 0.2 300);
}
```

Set `--ft-accent` (and, if the ring's foreground needs to change too,
`--ft-accent-foreground`) higher up the tree to retint every `Toggle` beneath
it.

Three optional variables tune the motion. Each falls back to the library-wide
token, which falls back to a literal, so setting none of them is the supported
default:

| Variable                      | Default                          | What it controls                                    |
| ----------------------------- | -------------------------------- | --------------------------------------------------- |
| `--ft-toggle-press-scale`     | `0.97`                           | How far the button shrinks while held down          |
| `--ft-toggle-press-opacity`   | `0.85`                           | The pressed fade used instead, under reduced motion |
| `--ft-toggle-signal-duration` | `var(--ft-duration-fast, 150ms)` | How long the pressed ring takes to fade in          |

## Motion

- The pressed accent ring fades in over 150 ms on the same easing as the
  colour beside it, instead of appearing a frame ahead of it. It is painted by
  a `::before` pseudo-element rather than by the button's own `box-shadow`,
  which leaves that shadow free to be the focus ring — a focus ring must never
  animate, so the two signals are kept on separate layers.
- Pressing the button scales it to `0.97` for as long as it is held.
- **Reduced motion.** Both the ring fade and the press scale are declared
  inside `@media (prefers-reduced-motion: no-preference)`. Without that
  preference the ring simply appears, and the press is acknowledged with an
  `opacity: 0.85` fade instead of a scale — never both at once.
- **Touch and coarse pointers.** `:active` is exactly the affordance a finger
  gets, so the press feedback is not suppressed on touch. The button carries
  `touch-action: manipulation`, which removes the browser's ~300 ms tap delay
  without blocking scrolling.

## Implementation Notes

- Uncontrolled and controlled usage both work from the same `pressed` prop:
  bind it with `bind:pressed` for two-way state, or leave it out and read the
  `onPressedChange` callback instead — the component owns its own state either
  way, since `pressed` is declared `$bindable`.
- The state flip happens once, directly in the click handler. It is never done
  inside an `$effect`, which would mean reading and writing the same state in
  one pass and would fight a caller's own `bind:pressed` write.
- The pressed look is a `bg-secondary` surface plus an **inset** accent ring
  (`box-shadow: inset 0 0 0 1px …`), not a border — that way it reads the same
  on top of both the `ghost` and `outline` variants instead of doubling up
  with the outline's own border.
- Sizes are exact pixel geometry (`30px`/`36px`/`42px` squares with `6px`/
  `8px`/`10px` radii), not the closest Tailwind scale step, so the three sizes
  stay proportioned to each other.
- `disabled` sets the native `disabled` attribute — the click handler's own
  guard is redundant against that, but keeps the component's state change
  logic self-contained if it is ever called from somewhere other than a click.
- Pass `label` whenever `children` is icon-only; without it, the accessible
  name falls through to whatever text content is inside the button.

## Sound

`sound?: boolean` (default `false`) plays a short confirmation cue through the
sound controller whenever the toggle actually flips — `toggle-on` when
activating while off, `toggle-off` when activating while on. Nothing plays
while `disabled`. Off by default; the cue is only audible once the user has
separately turned sound on. See `sound/README.md` for how the preference and
playback work.
