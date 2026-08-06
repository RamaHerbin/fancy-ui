# InlineCitation

A numbered reference that sits inside a sentence and shows the document behind it on hover.

Grounded answers need somewhere to put the receipt. A footnote list at the bottom makes the reader leave the sentence to find out which claim it backs; a full card inline breaks the prose apart. This is the third option: a small `[3]` that stays out of the way until asked, and a floating card that arrives with the title, the domain and enough of the text to judge whether the link is worth following.

## Usage

```svelte
<script lang="ts">
	import { InlineCitation } from "fancy-ui-svelte";

	const source = {
		id: "s1",
		title: "Constrained decoding for tool calls",
		url: "https://example.com/papers/constrained-decoding",
		snippet: "Schema-constrained sampling removes the retry loop entirely.",
	};
</script>

<p>
	Structured output is a decoding constraint, not a prompt<InlineCitation {source} index={1} />, so
	the guarantee holds even at temperature 1.
</p>
```

```svelte
<!-- No link: the marker only reveals the card -->
<InlineCitation {source} index={2} href="" />
```

```svelte
<!-- Your own card body -->
<InlineCitation {source} index={3}>
	{#snippet preview(s)}
		<span class="block font-medium">{s.title}</span>
		<span class="text-muted-foreground block text-xs">Retrieved 2 minutes ago</span>
	{/snippet}
</InlineCitation>
```

## Props

| Prop      | Type                    | Default      | Description                                                  |
| --------- | ----------------------- | ------------ | ------------------------------------------------------------ |
| `source`  | `SourceData`            | —            | The document being cited; fills the card                     |
| `index`   | `number`                | —            | The reference number; `3` renders `[3]`                      |
| `href`    | `string`                | `source.url` | Link target; `""` renders an unlinked marker                 |
| `preview` | `Snippet<[SourceData]>` | —            | Replaces the default `SourceCard` body, receiving the source |
| `onOpen`  | `() => void`            | —            | Called each time the card appears, once per appearance       |
| `class`   | `string`                | —            | Additional CSS classes, merged onto the marker               |
| `ref`     | `HTMLElement\|null`     | `null`       | Bindable reference to the marker element                     |

## Behavior

The card body is a `SourceCard` — the same card the sources list shows — so a document a reader meets under an answer is recognisable when they meet it again mid-sentence, and there is one implementation of "what is this document's host and monogram" rather than two that drift. `preview` replaces that body; the floating surface, its placement and its dismissal stay with this component either way.

The card is a tooltip, not a popover: supplementary content that appears on hover or focus, never takes focus itself, and holds nothing the reader cannot get another way.

| Input                         | What happens                                                            |
| ----------------------------- | ----------------------------------------------------------------------- |
| Pointer rests on the marker   | Card appears after 150 ms                                               |
| Pointer leaves before 150 ms  | Nothing appears; the pending open is cancelled                          |
| Pointer leaves the marker     | Card stays for 250 ms, long enough to walk the pointer into it          |
| Pointer enters the card       | The pending close is cancelled; the card stays as long as it is hovered |
| Marker receives focus         | Card appears immediately — no delay for keyboard users                  |
| Marker loses focus            | Card closes immediately                                                 |
| `Escape`                      | Card closes, whether it was opened by hover or by focus                 |
| `Enter` on a linked marker    | Follows the link, as any anchor would                                   |
| Activating an unlinked marker | Shows the card, which is all an unlinked marker can do                  |

`href=""` is the opt-out, not an omitted `href`: leaving the prop off falls through to `source.url`. Linked markers are real anchors carrying `target="_blank"` and `rel="noopener noreferrer nofollow ugc"`, since a cited URL is by definition somebody else's page. Unlinked markers are buttons, so they are still in the tab order and still reachable without a pointer.

## Accessibility

- The marker's visible text is a bare `[3]`, which names nothing out loud, so its accessible name is `Source 3: <title>`. The number stays for sighted readers; the title carries the meaning for everyone else.
- The card is `role="tooltip"` and is pointed at by the marker's `aria-describedby` — but only while it is on screen, since a reference to an absent element is a dangling one.
- The card exists in the DOM only while it is shown. A permanently mounted hidden tooltip is a paragraph that every screen-reader element list and every crawler steps over, mid-sentence, once per citation.
- Focus never enters the card. There is nothing in it to operate, and moving focus into a hover-triggered surface is how tooltips turn into traps.

## Theming

```svelte
<div style="--ft-citation-fg: oklch(0.6 0.2 260); --ft-citation-preview-width: 20rem">
	<InlineCitation {source} index={1} />
</div>
```

| Variable                       | Default                  | Effect                                   |
| ------------------------------ | ------------------------ | ---------------------------------------- |
| `--ft-citation-fg`             | `--color-primary`        | Marker colour                            |
| `--ft-citation-bg`             | 14% of the marker colour | The hover/focus pill behind the marker   |
| `--ft-citation-preview-bg`     | `--color-popover`        | Floating surface under the card          |
| `--ft-citation-preview-border` | `--color-border`         | Outline, drawn only around a custom body |
| `--ft-citation-preview-width`  | `16rem`                  | Card width, capped at the viewport       |

The hover pill is mixed from `currentColor`, so retinting the marker retints its hover state with it — the two cannot drift apart. Every variable is read at its point of use with a fallback rather than declared on a root, so a consumer's value inherits in without having to out-specify the component's own scoped rules.

## Implementation notes

- Positioning comes from the shared `float` action in `_internals/float.ts`, with `placement: "top"` and an 8px offset. It pins the card with `position: fixed`, flips it below the marker when the top of the viewport is too tight, clamps it inside the padding on both axes, and re-measures on scroll and resize. The anchor is passed as a getter rather than the element itself, so each re-measure reads the marker's current rect instead of a stale one.
- The card renders in the component's own DOM position — there is no portal. `position: fixed` takes it out of flow, so it never disturbs the line it interrupts, and it is a `<span>` with block display rather than a `<div>`, which keeps the markup valid inside the `<p>` it usually lives in.
- The entrance animation lives entirely inside `@media (prefers-reduced-motion: no-preference)`. With that rule gone the card simply appears, already correctly placed.
- `onOpen` reports appearances, not intentions. Re-entering a card that is already on screen fires nothing; it is the right hook for logging which sources a reader actually looked at.
- `source.domain` wins when it is set; otherwise the host is derived from `source.url` with any `www.` stripped. A URL with no parsable host simply drops the domain line rather than printing something that is not a domain. The card brings its own border, surface and padding, so the floating box around it adds none — a second frame would draw a card inside a card. A `preview` snippet gets that padded, bordered box back, since its body is not one.
- The marker is a hand-made superscript: `font-size: 0.75em`, `line-height: 1`, and a relative offset off the baseline. `vertical-align: super` lifts a box without shrinking it, so a marker inheriting the prose line-height stretches the line box it sits in — leaving a paragraph with visibly wider gaps under exactly the lines that carry a citation. A relative offset moves paint without touching layout, and the short line box fits inside any sensible leading.
- The marker's markup ends where the marker does. A whitespace text node between it and whatever follows would push the next character off the citation, turning `read[3].` into `read[3] .` in every sentence that ends on a reference.
