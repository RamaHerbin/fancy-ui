# Follow Button

A follow toggle that answers at once. The click flips the button to the result it
asked for, a small ring shows the request is out, and then one of two things
happens: the server agrees and the new state is committed, or it refuses, the
button rolls back, says so, and a second click tries again. The width never
moves while any of this happens.

## Components

- `FollowButton` - A `Button` wired to an optimistic, rollback-safe toggle with
  a stable accessible name, a width held steady across every label, and an
  assertive announcement when an attempt fails

## Usage

```svelte
<script>
	import { FollowButton } from "fancy-ui-svelte";

	let following = $state(false);
</script>

<FollowButton bind:following label="Follow Rama" />
```

Talk to a server. Return a promise from `onToggle`: resolve commits the value,
reject (or throw) rolls back, shows the error and announces it.

```svelte
<script>
	import { FollowButton } from "fancy-ui-svelte";

	let following = $state(false);

	async function onToggle(next) {
		const res = await fetch("/api/follow", { method: next ? "PUT" : "DELETE" });
		if (!res.ok) throw new Error("follow failed");
	}
</script>

<FollowButton bind:following {onToggle} label="Follow Rama" />
```

Icon-only, for a dense row:

```svelte
<FollowButton iconOnly label="Follow Rama" />
```

## Props

| Prop                | Type                                                         | Default                                 | Description                                                                                                                                   |
| ------------------- | ------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `following`         | `boolean`                                                    | `false`                                 | Whether the viewer follows. Bindable; written back only when an attempt is committed                                                          |
| `onToggle`          | `(next: boolean) => void \| Promise<unknown>`                | —                                       | Called with the value the click asks for. Nothing returned commits at once; a promise commits on resolve and rolls back on reject or throw    |
| `onFollowingChange` | `(following: boolean) => void`                               | —                                       | Called with the committed value, once per successful attempt. Not called for a rolled-back or superseded one                                  |
| `label`             | `string`                                                     | idle label                              | Stable accessible name, e.g. `"Follow Rama"`. It never changes with the visible text                                                          |
| `labels`            | `{ follow?: string; following?: string; unfollow?: string }` | `Follow` / `Following` / `Unfollow`     | Visible text per state                                                                                                                        |
| `errorLabel`        | `string`                                                     | `"Try again"`                           | Visible text and assertive announcement after a failed attempt                                                                                |
| `resetMs`           | `number`                                                     | `2000`                                  | How long the error state holds before reverting, in milliseconds. `0` reverts on the next tick                                                |
| `variant`           | `ButtonVariant`                                              | `"primary"` idle, `"outline"` following | Passed to the underlying `Button`. Left unset, the variant follows the state                                                                  |
| `size`              | `ButtonSize`                                                 | `"md"`                                  | Passed straight through to the underlying `Button`                                                                                            |
| `disabled`          | `boolean`                                                    | `false`                                 | Disables the button and blocks the toggle                                                                                                     |
| `iconOnly`          | `boolean`                                                    | `false`                                 | Drops the visible text, keeping the accessible name                                                                                           |
| `onclick`           | `(event: MouseEvent) => void`                                | —                                       | Fires on activation, right after the toggle starts; never called while `disabled` or pending                                                  |
| `class`             | `string`                                                     | —                                       | Additional CSS classes                                                                                                                        |
| `ref`               | `HTMLButtonElement \| HTMLAnchorElement \| null`             | `null`                                  | Bindable element reference                                                                                                                    |
| `sound`             | `boolean`                                                    | `false`                                 | Plays `toggle-on` / `toggle-off` on a committed change and `error` on a failed one, with the error vibration, once the user has enabled sound |

Every other attribute and listener (`id`, `aria-*`, `data-*`, `onfocus`, ...) is
forwarded to the inner `<button>`. `type`, `aria-pressed`, `aria-busy` and
`data-state` stay the component's.

## States

`data-state` on the button is `idle`, `pending` or `error`.

- **idle** - `aria-pressed` is the committed value.
- **pending** - the button already shows the value it asked for, carries
  `aria-busy="true"`, and keeps focus (it is never `disabled`). A click while an
  attempt is out is ignored: it neither calls `onToggle` nor `onclick`.
- **error** - the button is back on the committed value, shows `errorLabel` in a
  failure skin, and the single live region announces `"<label>: <errorLabel>"`
  assertively. After `resetMs`, or on the next click (the retry), it leaves.

A write to `following` from the parent while an attempt is pending wins: the
attempt is dropped, whatever it later does changes nothing, and
`onFollowingChange` is not called for it.

## Accessibility

- A native `<button>` with `aria-pressed`. The accessible name is `label` (or
  the idle text) and never follows the visible text, so a screen reader does not
  hear the state twice.
- Pending is `aria-busy`, never `disabled`, so focus stays where it was.
- One live region (the one `StatusMorph` portals to `document.body`): silent
  while loading, assertive on failure.
- The "Unfollow" preview appears on hover or keyboard focus of a fine pointer
  only, as a second layer of the same text cell. Touch screens never show a
  hover-only state.

## Theming

| Variable            | Default                                                            | Applies to                                                        |
| ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `--ft-status-error` | `light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))` | The failed skin's border, background wash and text, and the cross |

The default is a `light-dark()` pair, so **your theme must declare
`color-scheme`** for the right half to be picked.

## Motion

- **Width never changes** - the visible text sits in a one-cell grid with four
  hidden copies of `labels.follow`, `labels.following`, `labels.unfollow` and
  `errorLabel`, so the button is as wide as the widest from the first paint.
  Nothing is measured, so it is SSR-safe. `iconOnly` reserves nothing.
- **Text swap** - `80ms` out and `160ms` in (`--ft-ease-in` / `--ft-ease-out`);
  the outgoing text is an `aria-hidden` layer.
- **Reduced motion** - every transform and opacity rule lives inside
  `@media (prefers-reduced-motion: no-preference)`. Under reduce the text snaps
  and no outgoing layer is rendered; the unfollow preview never animated.

## Sound

Set `sound` to play a cue on the outcome through the shared sound controller
(see [`sound/README.md`](../sound/README.md)): `toggle-on` or `toggle-off` when
a change is committed, `error` when an attempt fails (with the error vibration
where the device has one). It is opt-in and silent by default, and the inner
`Button` stays quiet so a click only ever plays one cue.

## Implementation Notes

- The state machine is `follow-core.ts`, a pure module shared byte for byte by
  the Svelte, React and Vue ports: press, settle, adopt and cancel, each taking
  a snapshot and returning the next one. Every attempt carries a ticket; a
  promise that settles under an older ticket changes nothing, which covers a
  parent that answers first, a retry, and an unmount with a request in flight.
- While pending the button paints the requested value but keeps the last
  committed one as `following`, which is what a rollback returns to.
- `StatusMorph` is driven rather than bound (`resetAfter={0}`): its state comes
  from the machine, so it can never disagree with the button.
