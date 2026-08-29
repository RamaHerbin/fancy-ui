# Scroll Anchor

A scroll region that stays pinned to its last line while content streams in, lets go the moment the reader scrolls up to look back, and floats a pill offering the way down again.

## Components

- `ScrollAnchor` — the scrolling region plus its return button

## Usage

```svelte
<script>
	import { ScrollAnchor } from "fancy-ui-svelte";

	let streaming = $state(true);
	let lines = $state([]);
</script>

<ScrollAnchor active={streaming} maxHeight="24rem" class="rounded-lg border">
	<div class="flex flex-col gap-2 p-4">
		{#each lines as line, i (`${line.id}#${i}`)}
			<p>{line.text}</p>
		{/each}
	</div>
</ScrollAnchor>
```

Give the region a height to scroll inside — either `maxHeight`, or a bounded parent for the default `"100%"` to resolve against.

## Props

| Prop              | Type                       | Default            | Description                                                        |
| ----------------- | -------------------------- | ------------------ | ------------------------------------------------------------------ |
| `active`          | `boolean`                  | `true`             | Whether the region pins itself to the bottom as content arrives    |
| `bottomThreshold` | `number`                   | `40`               | How close to the bottom (px) still counts as pinned                |
| `returnLabel`     | `string`                   | `"Jump to latest"` | Label on the floating return button                                |
| `showReturn`      | `boolean`                  | `true`             | Whether the return button appears once the reader scrolls away     |
| `maxHeight`       | `string`                   | `"100%"`           | Height cap on the scrolling region — any CSS length                |
| `onStickChange`   | `(stuck: boolean) => void` | `undefined`        | Called when the region pins itself or lets go, not on every scroll |
| `children`        | `Snippet`                  | —                  | The scrolling content. Required.                                   |
| `class`           | `string`                   | `undefined`        | Additional CSS classes, applied to the outer wrapper               |
| `ref`             | `HTMLDivElement \| null`   | `null`             | Bindable reference to the root element                             |
| `sound`           | `boolean`                  | `false`            | Plays `press` on the return pill, once the user has enabled sound  |

## The pinning contract

"Pinned" is a pure function of the distance from the bottom, recomputed on every scroll event — there is no programmatic-scroll flag to fall out of sync with. Whatever the scrollbar says is the truth:

- Within `bottomThreshold` of the bottom → **pinned**. New content pulls the view down with it.
- Anywhere above that → **released**. New content lands below the fold and the view does not move.

Content that fits its container is pinned by definition. A region that mounts already overflowing and scrolled to the top starts released, and says so straight away by showing the return button.

`onStickChange` fires only when the state flips, so it is safe to write straight into a `$state` without debouncing.

## `active`, and what happens when it is false

`active` is the switch for the whole behaviour — bind it to whatever says a response is still arriving:

```svelte
<ScrollAnchor active={streaming}>…</ScrollAnchor>
```

With `active={false}` the region is an ordinary scroll box: nothing is observed, nothing moves on its own, `onStickChange` goes quiet, **and the return button is not shown**. That last part is deliberate rather than incidental — with the scroll listener disconnected nothing could ever notice the reader arriving back at the bottom, so a pill left on screen would be one that nothing could dismiss.

Flipping `active` back to `true` resumes from where the reader actually is.

## The return button

Once released, a pill floats over the bottom edge of the region: a down arrow, hidden from assistive technology, plus `returnLabel` as its accessible name. Pressing it scrolls to the bottom, which puts the region back inside the threshold and takes the pill away again.

That scroll is smooth — a journey the reader asked for is worth showing — unless they have asked for no journeys at all, in which case `prefers-reduced-motion: reduce` makes them simply arrive. Pressing it also hands focus to the scroll region, because the button that had the focus is about to unmount and would otherwise drop the keyboard back to the document body.

`showReturn={false}` drops the button entirely and leaves `onStickChange` as the only signal — the right choice when your layout already has somewhere better to put that affordance.

## Sound

Set `sound` to play the `press` cue when the return pill is activated, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ScrollAnchor active={streaming} sound>…</ScrollAnchor>
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the component **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). Only the pill's own click plays — `handleStick` and the geometry effect that recomputes `stuck` are scroll-driven and stay silent, and the cue is never generalised to whatever `children` scrolls inside the region.

## Styling

The `class` prop lands on the outer wrapper, so borders, rounding and background go there; the scroll region inside inherits the border radius, so a rounded wrapper does not have content sliding under its corners.

| Variable                   | Default   | Applies to                                      |
| -------------------------- | --------- | ----------------------------------------------- |
| `--ft-scrollanchor-offset` | `0.75rem` | Gap between the return pill and the bottom edge |

Two class hooks are stable for consumers who need more than that: `.ft-scrollanchor-region` on the scrolling div and `.ft-scrollanchor-return` on the pill.

## Implementation Notes

- The pinning itself lives in an internal action that watches the region with a `MutationObserver` and a `ResizeObserver`, batching every change in a frame into a single write. Re-pinning is always instant, never smooth: a smooth scroll still in flight reads as "not at the bottom" on the next scroll event, which would unstick the region mid-animation.
- The component keeps its own mirror of the pinned state purely so the button can be rendered from it, and reads the region's geometry once on mount so that mirror is right from the first frame rather than from the first scroll. The action re-reads the same geometry every time it reconnects, so a region that was scrolled — or grew — while `active` was false is judged as it is then, not as it was when the action was created.
- The pill's entrance fade is the only motion, and it sits behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same button in the same place, already there.
- Centring is done in CSS rather than with a translate utility, because the entrance keyframes animate `transform` and a utility writing the separate `translate` property would compose with it into a double shift.
- `overscroll-behavior: contain` keeps a flick at the end of the region from scrolling the page behind it.
- Nothing is scheduled and no DOM is touched at construction time, so the region renders under SSR unchanged — server output is the content, unpinned, with no button.
- Modern browsers make an overflowing container keyboard-focusable on their own, so the region carries `tabindex="-1"` rather than `0`: it takes focus when the return button hands it over, and adds nothing to the tab order the rest of the time. A consumer who needs to support older browsers can wrap their content accordingly.
