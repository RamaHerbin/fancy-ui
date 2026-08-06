# Sources

The citations under an answer, as a pill you can ignore and a set of cards you can scan. Collapsed, it is a stack of monograms and a count; open, it is one card per document — title, host, and the line worth reading.

## Components

- `Sources` — the root. Holds the citation set and the open state, publishes context.
- `SourcesTrigger` — the collapsed pill: monogram stack, count, chevron.
- `SourcesList` — the expanding region of cards.
- `SourceCard` — one citation. Works on its own, anywhere.

The parts read the root through context, so they can sit anywhere inside it — directly in the root, or nested a few components deep in your own wrapper — without the sources or the open state being threaded down as props.

## Usage

```svelte
<script lang="ts">
	import { Sources } from "fancy-ui-svelte";

	const sources = [
		{
			id: "s1",
			title: "Designing citation surfaces",
			url: "https://docs.example.dev/patterns/citations",
			snippet: "A citation is a promise that the answer can be checked.",
		},
	];
</script>

<p>{answer}</p>
<Sources {sources} />
```

That is the whole component. With no `children`, the root renders its own trigger and list, so the bare form is the one most answers want.

### Composing it yourself

Pass `children` and you place the parts — reordered, wrapped, or with only one of them present:

```svelte
<script lang="ts">
	import { Sources, SourcesTrigger, SourcesList } from "fancy-ui-svelte";

	let open = $state(false);
</script>

<Sources {sources} bind:open onToggle={(next) => track("sources", next)}>
	<SourcesTrigger label="Checked against 4 papers" />
	<SourcesList>
		{#snippet item(source, index)}
			<a href={source.url}>{index + 1}. {source.title}</a>
		{/snippet}
	</SourcesList>
</Sources>
```

### `SourceCard` on its own

The card has no context dependency at all, so it works anywhere a single citation needs rendering — a hover preview over an inline citation, a "cited by" rail, a search result:

```svelte
<script lang="ts">
	import { SourceCard } from "fancy-ui-svelte";
</script>

<SourceCard source={sources[0]} />
```

It is the only part that behaves this way. The trigger and the list also survive being rendered outside a root — the pill reads `0 sources` and does nothing, the list renders empty and stays open — but there is no reason to do that on purpose.

## Props

### Sources

| Prop       | Type                      | Default     | Description                                                  |
| ---------- | ------------------------- | ----------- | ------------------------------------------------------------ |
| `sources`  | `SourceData[]`            | —           | The documents backing the answer, in reading order. Required |
| `open`     | `boolean`                 | `false`     | Whether the list is expanded. Bindable                       |
| `onToggle` | `(open: boolean) => void` | `undefined` | Called when the pill is clicked, with the state it moved to  |
| `children` | `Snippet`                 | `undefined` | Replaces the default trigger-and-list composition entirely   |
| `class`    | `string`                  | `undefined` | Additional CSS classes                                       |
| `ref`      | `HTMLDivElement \| null`  | `null`      | Bindable reference to the root `<div>`                       |

`onToggle` fires only when the pill is clicked. Driving `open` yourself — through the binding or the prop — changes the state without calling it, which is what lets a caller tell "the reader opened this" apart from "I opened this".

### SourcesTrigger

| Prop    | Type     | Default     | Description                                                        |
| ------- | -------- | ----------- | ------------------------------------------------------------------ |
| `label` | `string` | `undefined` | Overrides the count line. Defaults to `4 sources`, singular at one |
| `class` | `string` | `undefined` | Additional CSS classes                                             |

### SourcesList

| Prop    | Type                            | Default     | Description                                              |
| ------- | ------------------------------- | ----------- | -------------------------------------------------------- |
| `item`  | `Snippet<[SourceData, number]>` | `undefined` | Replaces the default card. Gets the source and its index |
| `class` | `string`                        | `undefined` | Additional CSS classes, on the grid                      |

### SourceCard

| Prop     | Type         | Default     | Description                                       |
| -------- | ------------ | ----------- | ------------------------------------------------- |
| `source` | `SourceData` | —           | The document being cited. Required                |
| `icon`   | `Snippet`    | `undefined` | Replaces the monogram: a favicon you host, a logo |
| `class`  | `string`     | `undefined` | Additional CSS classes                            |

## The data

Every part reads the shared `SourceData` shape:

```ts
interface SourceData {
	id: string;
	title: string;
	url: string;
	snippet?: string;
	domain?: string;
}
```

Only `title` always renders. `domain` is shown when given and otherwise derived from `url` (minus the `www.`), so a caller who wants `the standards body` under a title can say so instead of getting `www.example.org`. A source with no usable `url` renders as a plain card rather than a link — a citation with nowhere to go is still worth showing, it just must not pretend to be clickable.

## The context contract

The root publishes this under `SOURCES_CONTEXT_KEY`:

```ts
interface SourcesContext {
	readonly open: { readonly current: boolean };
	readonly count: number;
	readonly sources: readonly SourceData[];
	readonly listId: string;
	toggle(): void;
}
```

Everything is a getter over the root's own props, so a part that reads it inside a reactive scope updates with the root. `listId` is the id the list puts on its region and the trigger points `aria-controls` at, which is the only way two sibling components can agree on one.

Both the key and the type are exported, so you can build your own parts:

```svelte
<script lang="ts">
	import { getContext } from "svelte";
	import { SOURCES_CONTEXT_KEY, type SourcesContext } from "fancy-ui-svelte";

	const sources = getContext<SourcesContext | undefined>(SOURCES_CONTEXT_KEY);
</script>

<button onclick={() => sources?.toggle()}>{sources?.count ?? 0} references</button>
```

Read it as optional. Every shipped part does, so a part rendered outside a root degrades instead of throwing.

## Styling

| Custom property              | Default                                              | Effect                                   |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `--ft-sources-min-column`    | `13rem`                                              | Narrowest a card column may get          |
| `--ft-sources-gap`           | `0.5rem`                                             | Space between cards                      |
| `--ft-sources-card-bg`       | `color-mix(in oklab, currentColor 3%, transparent)`  | Card fill                                |
| `--ft-sources-card-hover-bg` | `color-mix(in oklab, currentColor 7%, transparent)`  | Card and pill fill on hover              |
| `--ft-sources-card-border`   | `var(--color-border, …)`                             | Card and pill border                     |
| `--ft-sources-trigger-bg`    | `transparent`                                        | Pill fill at rest                        |
| `--ft-sources-chip-bg`       | `color-mix(in oklab, currentColor 12%, transparent)` | Monogram fill                            |
| `--ft-sources-chip-fg`       | `inherit`                                            | Monogram letter colour                   |
| `--ft-sources-chip-ring`     | `var(--color-background, canvas)`                    | Ring cutting the stacked monograms apart |

Set them on the component, or on any ancestor:

```svelte
<div style="--ft-sources-min-column: 100%; --ft-sources-chip-bg: var(--color-primary);">
	<Sources {sources} />
</div>
```

Setting `--ft-sources-min-column` to `100%` is how you force the single-column stack a narrow chat needs.

## Implementation Notes

- The list expands with `grid-template-rows: 0fr → 1fr`, which is the only way to transition an auto height without measuring anything. The inner wrapper does the clipping.
- The collapsed region is `inert`. The cards are links, so leaving them reachable would drop a keyboard into content nobody can see.
- Cards flow into `repeat(auto-fill, minmax(--ft-sources-min-column, 1fr))`, so the same list is a stack in a chat column and a grid in a document, with no breakpoint to configure.
- The entrance stagger hangs off a class rather than mount, because the cards never unmount — collapsing is a height transition over live DOM, so re-adding the class is the only thing that can replay it. The delay is clamped at the seventh card: past a handful, a stagger stops reading as sequence and starts reading as lag.
- Everything that moves — the expansion, the chevron, the stagger, the hover tints — lives inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion gets the same states, instantly.
- The monogram is a letter, never a favicon. Loading real favicons would mean a request from every reader's browser to every cited site — a tracking beacon nobody asked for, and a broken image the moment a site is gone. Pass `icon` if you host your own.
- The letter is taken with the spread rather than `charAt`, so a title starting outside the BMP yields a whole character instead of half a surrogate pair.
- Links carry `rel="noopener noreferrer nofollow ugc"` and `target="_blank"`: a model chose the destination, not the author of the page it sits on, and the tab it opens has no business reaching back into the app.
- The trigger's monogram stack is `aria-hidden`. It is decoration; every name in it is spelled out in the list below.
