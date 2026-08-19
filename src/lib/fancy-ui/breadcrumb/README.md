# Breadcrumb

A data-driven trail of `<nav aria-label>` + `<ol>` — not a compound. The
`…` truncation is a decision about the whole list (which items survive,
which don't) and cannot be made from inside a single crumb, so `Breadcrumb`
takes the full trail as data and renders every crumb itself.

## Usage

```svelte
<script>
	import { Breadcrumb } from "fancy-ui-svelte";

	const trail = [
		{ label: "Docs", href: "/docs" },
		{ label: "Core", href: "/docs/core" },
		{ label: "Button" },
	];
</script>

<Breadcrumb items={trail} />
```

The **last item is always the current page**: it renders as plain text with
`aria-current="page"`, never a link — even if it carries an `href`. Every
other item renders as a link when it has an `href`, or plain text when it
doesn't.

### Truncation

```svelte
<Breadcrumb items={longTrail} maxItems={4} itemsBeforeCollapse={1} itemsAfterCollapse={2} />
```

Once `items.length` exceeds `maxItems`, the trail collapses to the first
`itemsBeforeCollapse` items, an ellipsis, then the last `itemsAfterCollapse`
items. `maxItems` defaults to `0`, which never collapses.

**The ellipsis is purely decorative**, not an interactive disclosure: it is
`aria-hidden`, never a `<button>`, and never in the tab order. The
consequence of that choice is that the crumbs it hides are not reachable
through the breadcrumb itself — they exist only in `items`, not in the
rendered trail. If every crumb needs to stay reachable, either raise
`maxItems` so nothing collapses, or supply your own `item` snippet with
whatever disclosure pattern (a dropdown, say) your app already has.

If `itemsBeforeCollapse + itemsAfterCollapse >= items.length`, collapsing
would have to duplicate or drop a crumb to do anything useful — so it is
skipped outright and the full trail renders instead.

**`itemsAfterCollapse` has a floor of `1`.** The trailing slice is the only
place the last item — the current page — can ever end up, so `0` is silently
treated as `1` rather than honoured literally. `itemsBeforeCollapse` has no
equivalent floor: `0` genuinely means "start the trail with `…`", since
losing the _first_ crumb to the ellipsis never removes the current page.
There is no such thing as "collapse away the current page" in this
component — the last item always renders with `aria-current="page"`,
collapsed trail or not.

### Custom rendering

```svelte
<Breadcrumb items={trail}>
	{#snippet item(crumb, index)}
		{#if index === trail.length - 1}
			<span aria-current="page">{crumb.label}</span>
		{:else if crumb.href}
			<a href={crumb.href}>→ {crumb.label}</a>
		{:else}
			{crumb.label}
		{/if}
	{/snippet}
</Breadcrumb>
```

Supplying `item` replaces the default rendering for **every** crumb,
including the last one — you take over deciding what's a link and what
carries `aria-current`. `Breadcrumb` still owns truncation and separators;
`item` only replaces what goes inside each crumb's own `<li>`.

## Props

| Prop                  | Type                                | Default        | Description                                                                                            |
| --------------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| `items`               | `BreadcrumbItem[]`                  | —              | The full trail, first to last. The last entry is always the current page. Required                     |
| `maxItems`            | `number`                            | `0`            | Collapse the trail once it holds more than this many items. `0` never collapses                        |
| `itemsBeforeCollapse` | `number`                            | `1`            | How many leading items stay visible once collapsed                                                     |
| `itemsAfterCollapse`  | `number`                            | `1`            | How many trailing items stay visible once collapsed. Floored at `1` — the current page is never hidden |
| `separator`           | `string`                            | `"/"`          | Separator glyph rendered between crumbs. Decorative — never read by a screen reader                    |
| `label`               | `string`                            | `"Breadcrumb"` | Accessible name for the `<nav>`                                                                        |
| `item`                | `Snippet<[BreadcrumbItem, number]>` | —              | Custom rendering for one crumb, given the item and its index in `items`                                |
| `class`               | `string`                            | —              | Additional CSS classes                                                                                 |
| `ref`                 | `HTMLElement \| null`               | `null`         | Bindable element reference (the `<nav>`)                                                               |

`BreadcrumbItem` is `{ label: string; href?: string }`.

## Theming

Every colour used — `text-muted-foreground`, `text-foreground`,
`text-muted-foreground/50` for the separator — is a shared theme token; the
component declares no local custom properties.

## Implementation Notes

- Truncation is computed with `$derived.by`, re-evaluated whenever `items`,
  `maxItems`, `itemsBeforeCollapse` or `itemsAfterCollapse` change — there is
  no `$state` involved and nothing to desync.
- `{#each}` keys are `` `${index}-${label}` ``, not the label alone: two
  crumbs can legitimately share the same text (nested "General" sections at
  different depths, say), and the original index keeps their keys distinct
  regardless.
- The separator between crumbs is its own `<li aria-hidden="true">`, not
  appended into the preceding crumb's own `<li>` — screen readers skip it
  either way since it's hidden from the accessibility tree, and keeping it
  separate means the crumb's own `<li>` never has to know whether a
  separator follows it.
- The ellipsis reuses the same `<li aria-hidden="true">` shape as a
  separator, deliberately: nothing about it is focusable, clickable, or
  differently exposed to assistive tech than the slashes around it.
