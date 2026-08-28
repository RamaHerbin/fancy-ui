# Presence

Mounts and unmounts content with a real entrance and exit — not just an
instant `{#if}` swap — driving `data-state` through
`opening → open → closing` and firing lifecycle callbacks a caller can hook
into. Shares `Reveal`'s preset vocabulary, plus `blur`/`zoom` — the one place
besides `Reveal` a preset may carry `filter`, and here it is opt-in per
instance rather than per child — with an asymmetric, faster-leaving exit by
default.

## Usage

```svelte
<script lang="ts">
	import { Presence } from "$lib/fancy-ui/presence";
	let open = $state(false);
</script>

<button onclick={() => (open = !open)}>Toggle</button>

<Presence {open}>
	<div class="rounded-lg border p-4">Panel content</div>
</Presence>
```

### A different preset

```svelte
<Presence {open} preset="zoom" duration={250}>
	<div class="card">…</div>
</Presence>
```

## Props

| Prop           | Type                                                                                               | Default  | Description                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`         | `boolean`                                                                                          | required | Whether the content is mounted and, once the entrance settles, visible                                                                        |
| `preset`       | `"fade" \| "fade-up" \| "fade-down" \| "fade-left" \| "fade-right" \| "scale" \| "blur" \| "zoom"` | `"fade"` | The entrance/exit look                                                                                                                        |
| `duration`     | `number`                                                                                           | `300`    | Entrance duration in ms                                                                                                                       |
| `exitDuration` | `number`                                                                                           | `200`    | Exit duration in ms — shorter than the entrance by default; leaving reads faster than arriving                                                |
| `delay`        | `number`                                                                                           | `0`      | Delay in ms before the entrance starts; applied to the exit too                                                                               |
| `distance`     | `number`                                                                                           | `16`     | Entrance travel distance in px for the four directional presets — the exit travels half as far                                                |
| `inert`        | `boolean`                                                                                          | `true`   | Whether the panel is `inert` while closing (Svelte already does this natively for any transitioning element — `false` is an explicit opt-out) |
| `onEnterEnd`   | `() => void`                                                                                       | —        | Fires once the entrance transition settles (`onintroend`)                                                                                     |
| `onExitEnd`    | `() => void`                                                                                       | —        | Fires once the exit transition settles (`onoutroend`) — not guaranteed if the component is destroyed mid-exit                                 |
| `children`     | `Snippet`                                                                                          | required | Panel content                                                                                                                                 |
| `class`        | `string`                                                                                           | —        | Additional CSS classes, merged onto the root                                                                                                  |
| `ref`          | `HTMLDivElement \| null` (bindable)                                                                | `null`   | Bindable reference to the root element — `null` while closed                                                                                  |

## Theming

`Presence` has no CSS custom properties and no `<style>` block — its motion
is entirely JS-timed, through the `duration`/`exitDuration`/`delay`/`distance`
props feeding `preset()`'s WAAPI keyframes directly. There is nothing for a
stylesheet to override; use the props.

## Motion

- **Reduced motion**: `createReducedMotion()` collapses both durations to
  `0` — Svelte's own `duration: 0` bypass finishes synchronously with no
  `Element.animate()` call at all, and the four lifecycle events still fire,
  in order, on the same tick.
- **Touch and coarse pointers**: nothing here is pointer-driven — `open`
  drives everything, not a hover or press interaction.
- **Timing**: the entrance defaults to `300ms` (`--ft-duration-base`) eased
  with `--ft-ease-out`; the exit defaults to a shorter `200ms`
  (`--ft-duration-exit`) eased with `--ft-ease-in`. `delay` applies to both
  directions by design, not just the entrance — a panel that opens after a
  beat should, symmetrically, take that same beat to register that it's
  being dismissed before it starts leaving; set `delay={0}` explicitly if an
  instance should close the moment `open` flips, regardless of its entrance
  delay. Both directions run through one direction-branching `transition:`
  directive rather than separate `in:`/`out:` ones, so a rapid `open` toggle
  mid-transition reverses smoothly instead of snapping.

## Accessibility

- `inert` (default `true`) is Svelte's own native behaviour for any
  transitioning element — applied the moment the exit starts, for free.
  `inert={false}` overrides it back to `false` inside the component's
  `onoutrostart` handler, the one point guaranteed to run right after
  Svelte's own assignment.
- **Closing a panel that contains the focused element moves focus to
  `<body>`.** Svelte sets `inert` on the panel the instant the exit starts
  (see above), and a focused element inside an `inert` subtree is blurred
  immediately by the browser — correct for something that is on its way out,
  but it means the caller must move focus itself, in the same handler that
  sets `open = false`. Doing it in `onExitEnd` is too late: that callback
  fires `exitDuration` later, after the user has already lost their place to
  `<body>` for the whole exit.
- `onEnterEnd`/`onExitEnd` exist for callers that need to coordinate with the
  real end of the DOM transition — for example, waiting for a panel's exit to
  actually finish before unmounting something that depended on it. For
  returning focus specifically, see the bullet above: do it when you set
  `open = false`, not in `onExitEnd`. `onExitEnd` is also not guaranteed if
  the component is destroyed mid-exit (an ancestor unmounting, say) — it only
  fires when Svelte's own outro completes normally.
- No intro plays on hydration or first mount — a local `transition:` never
  plays on its own block's initial render, and Svelte's `hydrate()`
  additionally defaults to skipping the intro outright. A
  `<Presence open={true}>` that is already open the first time it renders —
  hydrating, or a plain first client mount alike — starts directly in
  `"open"`, with no `introstart`/`introend` dispatched at all.

## Implementation notes

- **Cleanup**: nothing to tear down beyond what Svelte's `{#if}` + `transition:`
  already handles — the whole node (and its transition) is destroyed the
  moment the outro ends. The reduced-motion `matchMedia` listener is released
  the same way, via the `$effect` cleanup `createReducedMotion().start()`
  returns.
- `ref` returns to `null` the instant the exit finishes and the node is
  destroyed — `bind:this` inside the `{#if}` block, no custom teardown.
- **SSR**: `svelte/transition` only runs client-side; server output matches
  whatever `open` resolves to at render time, with no transition state to
  reconcile.
- `Presence` renders a plain, unstyled `<div>` (`display: block`) as its one
  wrapper element — there is no `as` prop to change the tag, unlike `Reveal`.
  Place it where an extra block-level element is harmless, or style it
  through `class`.
