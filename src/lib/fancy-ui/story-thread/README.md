# StoryThread

A narrative thread for scroll stories. In the horizontal layout the component
pins a full-height viewport and pans your sections sideways as the page
scrolls; a dotted line draws itself through the `StoryNode` anchors, a glowing
head rides its tip, and each node lights up as the thread reaches it. Several
segments can leave the same node and meet again, so the story can fork.

```svelte
<StoryThread
	segments={[
		{ nodes: ["intro", "school", "split"] },
		{ nodes: ["split", "a", "end"], color: "oklch(0.82 0.08 240)" },
		{ nodes: ["split", "b", "end"], color: "oklch(0.9 0.16 120)" },
	]}
>
	<section class="relative h-full w-[40rem]">
		… <StoryNode id="intro" class="absolute top-2/3 right-16" />
	</section>
	…
</StoryThread>
```

## Implementation notes

- **Shared engine.** Everything that moves lives in `story-thread-core.ts`, a
  framework-free module carried byte for byte by the Svelte, React and Vue
  trees (`shared-cores.json`). The component renders the root, the sticky
  viewport, the track and an empty `<svg>`; the core fills the `<svg>` and
  forwards nothing through framework state per frame.
- **Layout.** `auto` is horizontal from 900 × 520 px up
  (`STORY_THREAD_HORIZONTAL_QUERY`), vertical below. Horizontal: the root
  becomes a spacer `trackWidth − viewportWidth + viewportHeight` tall, the
  viewport is `position: sticky` and the track is moved with `translate3d`.
  It works on the page or inside any vertically scrolling container (the
  nearest one is used). Vertical: a plain stack, nothing is pinned.
- **Your sections size themselves.** In the horizontal layout the track is a
  no-wrap flex row at full height: give each section a width.
- **Thread.** One cubic per gap between consecutive node centres, tangents
  flat along the reading axis (`tension` of the gap). Each segment is drawn
  twice: a faint ghost of the whole path, and a bright copy uncovered by a
  mask path whose `stroke-dashoffset` follows the tip. The visible strokes are
  dotted (`0.5 11` with round caps), dashed or solid, which is why the reveal
  goes through a mask.
- **Tip.** Vertical: `lead` of the way down the viewport. Horizontal: starts
  `lead` of the way across and reaches the end of the track exactly when the
  pan does, so the last node is always drawn by the end of the story. The
  path is sampled every 6 px on each measure, so the bright part and the head
  stop exactly at the tip rather than at a fraction of the length.
- **Branches.** Each segment's span runs from its first to its last node, so
  two branches leaving the same node draw side by side and meet together.
  `color` sets the stroke and head colour of the drawn part.
- **Nodes.** `data-reached` is set on every node the tip has passed (the CSS
  lights it up). `onReach` and the optional sound fire on forward crossings
  only, never on the first paint.
- **Inputs (horizontal).** Native scroll and touch; a sideways wheel or
  trackpad pans (and lets go at both ends); mouse drag past 3 px, never from
  links, buttons, form fields or `[data-no-drag]`; ← / → step 85% of the
  viewport while focus is inside; focusing an element off-screen pans to it.
- **Re-measuring.** ResizeObserver on the track and the scroller, window
  resize, the layout media query, `document.fonts.ready`, and a
  MutationObserver for content changes (the `<svg>` it redraws is ignored).
- **Reduced motion.** The thread still follows scrolling (direct
  manipulation); arrow keys jump instead of gliding, the head stops breathing
  and nodes switch without a transition.
- **Accessibility.** The root is a focusable `region` named by `ariaLabel`;
  the `<svg>` and the nodes are `aria-hidden`. Without JavaScript, or before
  hydration, the content is a plain vertical stack with no thread.
- **Theming.** `--story-thread-color` (default `currentColor`),
  `--story-thread-faint`, `--story-thread-head`, `--story-thread-width`.
