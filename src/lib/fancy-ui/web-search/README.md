# Web Search

A search the agent ran, shown as it happens: the query in a search-bar header, a scanning bar while the lookup is in flight, and result rows that land one at a time as they are found.

## Components

- `WebSearch` - Query header, scanning bar, and an appending list of hits

## Usage

```svelte
<script>
	import { WebSearch } from "fancy-ui-svelte";

	let searching = $state(true);
	let results = $state([]);

	// Each hit is pushed onto the array as it arrives; the row for it animates in
	// on its own and the ones already on screen stay put.
	for await (const hit of agent.search("svelte 5 runes reactivity")) {
		results = [...results, hit];
	}
	searching = false;
</script>

<WebSearch query="svelte 5 runes reactivity" {results} {searching} maxVisible={4} />
```

Results are `SearchResultData`, the shape shared across the AI family:

```ts
import type { SearchResultData } from "fancy-ui-svelte";

const result: SearchResultData = {
	id: "r1",
	title: "Runes, one year in",
	url: "https://www.example.dev/blog/runes",
	snippet: "What changed once fine-grained reactivity replaced the compiler heuristics.",
};
```

## Props

| Prop         | Type                                                | Default        | Description                                                                    |
| ------------ | --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `query`      | `string`                                            | —              | What the agent looked up, shown in the search-bar header (required)            |
| `results`    | `SearchResultData[]`                                | —              | Hits found so far, oldest first; appending to it lands a new row (required)    |
| `searching`  | `boolean`                                           | `false`        | Whether the lookup is still running: drives the scanning bar and waiting state |
| `onSelect`   | `(result: SearchResultData, index: number) => void` | `undefined`    | Called when a row is activated; supplying it turns every row into a button     |
| `maxVisible` | `number`                                            | `0`            | Rows shown before the expander takes over; `0` shows every result              |
| `label`      | `string`                                            | `'Web search'` | Accessible name for the whole block                                            |
| `class`      | `string`                                            | `undefined`    | Additional CSS classes                                                         |
| `ref`        | `HTMLDivElement \| null`                            | `null`         | Bindable element reference                                                     |

## Slots

| Snippet | Arguments                                   | Description                                                       |
| ------- | ------------------------------------------- | ----------------------------------------------------------------- |
| `item`  | `(result: SearchResultData, index: number)` | Replaces the built-in row body, keeping the row and its behaviour |

```svelte
<WebSearch {query} {results}>
	{#snippet item(result)}
		<span class="flex min-w-0 flex-col">
			<span class="truncate font-medium">{result.title}</span>
			<span class="text-muted-foreground truncate text-xs">{result.url}</span>
		</span>
	{/snippet}
</WebSearch>
```

The override owns the row's contents, not the row itself: a hit with a `url` is still a link, and one with an `onSelect` is still a button.

## Theming

| Variable                        | Default               | Effect                           |
| ------------------------------- | --------------------- | -------------------------------- |
| `--ft-websearch-beam`           | `--ft-status-running` | Colour of the scanning bar       |
| `--ft-websearch-track`          | `currentColor` at 12% | The groove the beam runs in      |
| `--ft-websearch-monogram-bg`    | `currentColor` at 10% | Background of the domain initial |
| `--ft-websearch-scan-duration`  | `1.4s`                | One sweep of the scanning bar    |
| `--ft-websearch-enter-duration` | `260ms`               | How long a new row takes to land |
| `--ft-websearch-snippet-lines`  | `2`                   | Lines of snippet before clamping |

The beam defaults to `--ft-status-running`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError` — set that to retint every in-flight state in the family at once, or `--ft-websearch-beam` to move this component alone. Its own default is a `light-dark()` pair, so a page that declares `color-scheme` gets a legible accent on both themes without configuring anything.

```css
.transcript {
	--ft-websearch-snippet-lines: 3;
	--ft-websearch-scan-duration: 2s;
}
```

## Implementation Notes

- The `{#each}` is keyed on `result.id`, which is what makes the list append rather than redraw. A preserved node has already played its entrance and a CSS animation does not replay on an element that has one, so pushing a hit onto `results` animates exactly the new row and leaves the rest untouched. Reusing an id for a different result would put the old row's node behind the new data and skip its entrance.
- No stagger. The delay a cascade needs belongs to a row's position in a batch, and these rows arrive one at a time — a fourth hit landing three stagger-beats after it was found would read as lag, not as choreography.
- The scanning bar is deliberately indeterminate: a search reports no progress, so nothing here may look like a percentage. Under reduced motion the beam fills the whole groove at low opacity instead of freezing 40% of the way along, which would read as a bar stuck at 40%.
- Both animations live entirely inside `@media (prefers-reduced-motion: no-preference)`. With the rules gone a new row is simply present at its final position and the bar is a steady tint; there is no reduced-motion variant to keep in sync.
- The row element follows the data. `onSelect` wins and makes every row a `type="button"`; otherwise a `url` makes it an `<a>`, and a hit with neither — a blank `url` and no handler — is an inert `<div>`. Nothing is a fake button, and nothing focusable does nothing.
- Links carry `rel="noopener noreferrer nofollow ugc"` and `target="_blank"`. These are somebody else's pages surfaced by a model: `nofollow ugc` stops the host from vouching for them to search engines, and `noopener noreferrer` keeps the opened tab from reaching back.
- The monogram is the first letter or digit of the registrable domain, so a title starting with a quote or a bullet does not put punctuation in the circle. A blank, relative, or malformed `url` has no host to show: the domain line disappears and the monogram falls back to the title. Hosts and monograms are derived the same way here as on source cards, from one shared helper.
- `maxVisible` is a display cap, not a slice of the data — the count in the header always reports everything in `results`, and the expander label tracks new hits as they land behind it.
- Expanding is a request about one result set, and it retires with it. Emptying `results` — which is how a component driven by a live agent starts its next search — collapses the list again, so the following set arrives capped like the first instead of inheriting an expansion the reader asked for on results they can no longer see.
- The group is `role="group"` with `aria-label` from `label`, and carries `aria-busy` while the search runs, so a transcript announces the whole block as one named set rather than as loose links. The scanning bar is `aria-hidden`; "Searching…" says it in words while there is nothing to read.
