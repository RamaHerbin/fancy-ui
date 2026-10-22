# Accordion

A stack of headed sections where one or several open at a time: an FAQ, a
settings page, a filter panel. Each item is a `Collapsible` whose open state
belongs to the accordion, so it moves the same way (see `../collapsible`).

## Components

- `Accordion` — owns which values are open, publishes them through context
- `AccordionItem` — one section; republishes its state as a collapsible context
- `AccordionTrigger` — the button inside a heading, with a chevron
- `AccordionContent` — the `role="region"` that animates, labelled by its trigger

## Usage

```svelte
<script>
	import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "fancy-ui-svelte";

	let value = $state("shipping");
</script>

<Accordion type="single" collapsible bind:value>
	<AccordionItem value="shipping">
		<AccordionTrigger>How long does shipping take?</AccordionTrigger>
		<AccordionContent>Two working days.</AccordionContent>
	</AccordionItem>
	<AccordionItem value="returns">
		<AccordionTrigger>Can I return an item?</AccordionTrigger>
		<AccordionContent>Within 30 days.</AccordionContent>
	</AccordionItem>
</Accordion>
```

## `type` and `value`

- `type="single"` (the default): `value` is a string, `""` when nothing is open.
  Opening an item closes the previous one. The open item can only be closed
  again with `collapsible`; without it the open item's trigger carries
  `aria-disabled="true"` and ignores clicks, while staying focusable.
- `type="multiple"`: `value` is an array, in the order the items were opened.
  `collapsible` is ignored: any open item can always be closed.

`onValueChange` receives the same shape and fires once per toggle.

## Keyboard

Every trigger is in the tab order. Enter and Space toggle the focused item (a
native button does that on its own). The arrow keys move focus between the
triggers of this accordion without opening anything, skipping disabled items
and wrapping at both ends: Up and Down when `orientation="vertical"` (the
default), Left and Right when `"horizontal"`. Home and End jump to the first and
last. A nested accordion keeps its own triggers to itself.

## Headings

Each trigger sits in an element with `role="heading"`; set its level with
`headingLevel` (1 to 6, default 3) to fit the page's outline.

## Rendering closed content

On `AccordionContent`, `forceMount` defaults to `true`, as on
`CollapsibleContent` and unlike `TabsContent`: a closed item stays in the DOM,
`inert` and hidden, and is rendered on the server. The reasons are stable
`aria-controls` targets (each trigger always points at an existing region),
SSR, and no height measurement. Pass `forceMount={false}` to unmount the
children once the collapse is over and mount them again on open.

## Native attributes

The root, each item, the trigger button and the region forward native
attributes and listeners. The trigger's `id`, `type`, `aria-expanded`,
`aria-controls`, `data-state` and the region's `id`, `role`, `aria-labelledby`
and `data-state` stay the component's. A disabled trigger calls none of your
click or key listeners.
