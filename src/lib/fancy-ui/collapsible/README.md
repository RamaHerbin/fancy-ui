# Collapsible

A single disclosure: a button that expands and collapses a region. Release
notes, a "show more" list, an advanced-options block. For several related
disclosures that open one at a time, use `Accordion`, which is built on the
pieces here.

## Components

- `Collapsible` — owns the open state and the id pair, publishes both through context
- `CollapsibleTrigger` — the `<button>` with `aria-expanded` and `aria-controls`
- `CollapsibleContent` — the region that animates; its children stay in the page while it is closed

## Usage

```svelte
<script>
	import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "fancy-ui-svelte";

	let open = $state(false);
</script>

<Collapsible bind:open>
	<CollapsibleTrigger>{open ? "Show less" : "Show more"}</CollapsibleTrigger>
	<CollapsibleContent>The rest of the list…</CollapsibleContent>
</Collapsible>
```

Or handle the change yourself instead of binding, with `onOpenChange`. It
fires once per toggle from the trigger; a change you make by writing `open`
yourself does not call it.

## How it moves

`CollapsibleContent` animates `grid-template-rows` between `0fr` and `1fr`.
Nothing is measured, so the height can change while it moves (an image loads,
a nested panel opens) and an interrupted toggle simply reverses from where it
is. The panel is a grid of three layers: the region (`id`, `data-state`, your
attributes), a clipping layer, and a body that carries your `class`. Put
padding on the body through `class`, never on the region, or it would not
collapse with the rest.

- **Closing** makes the content `inert` straight away, so nothing inside can
  take focus while it is leaving, and keeps it painted until the collapse is
  over.
- **Closed** adds `visibility: hidden` once `transitionend` for
  `grid-template-rows` arrives. A deadline taken from the element's computed
  transition covers the cases where that event never comes.
- **Reduced motion** gives the transition no duration (`motion-reduce:`), and the
  panel settles immediately.
- Set the speed with `--ft-collapsible-duration` (default `240ms`).

## Rendering closed content

`forceMount` defaults to `true`, the inverse of `TabsContent`: a closed panel
stays in the DOM, `inert` and `visibility: hidden`, and is rendered on the
server. Three reasons:

- **Stable `aria-controls` targets.** The trigger always points at an element
  that exists, so the reference never dangles while the panel is closed.
- **SSR.** The closed markup is in the first response, so find-in-page, links
  into the content and form state work without a client round trip.
- **No measurement.** The panel animates `grid-template-rows` and never reads
  a height, which a mount-on-open panel would need to do.

Pass `forceMount={false}` to unmount the children once the collapse has
finished and mount them again on open, for content that should not run while
closed (an iframe, a video). The region itself always stays.

## Without a root

`CollapsibleTrigger` outside a `Collapsible` is a plain button; a
`CollapsibleContent` outside one stays collapsed. Neither throws.

## Native attributes

The root, the trigger and the region forward native attributes and listeners.
The trigger's `id`, `type`, `aria-expanded`, `aria-controls`, `data-state` and
`disabled` state, and the region's `id`, `data-state`, `inert` and
`visibility`, stay the component's. A disabled trigger calls none of your
click listeners.
