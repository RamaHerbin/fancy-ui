# ArtifactCard

A generated document, rendered as a thing rather than as a wall of text: a title, what kind of thing it is, which draft you are looking at, and six lines of the document itself dissolving into the card's edge.

It is the surface a model writes _into_. While the text arrives the top edge sweeps and a cursor trails the last character; when it lands the card sits still with a version number you can page through.

## Components

- `ArtifactCard` — the whole card: header, version navigator, preview, error footer

## Usage

```svelte
<script lang="ts">
	import { ArtifactCard } from "fancy-ui-svelte";

	let preview = $state("");
	let status = $state<"idle" | "streaming" | "done" | "error">("idle");
	let version = $state(1);
</script>

<ArtifactCard
	title="Q3 revenue review"
	kind="Memo"
	{status}
	{preview}
	{version}
	versionCount={3}
	onVersionChange={(next) => (version = next)}
	onOpen={() => openInSidePanel()}
/>
```

## Props

| Prop              | Type                                         | Default      | Description                                                                                               |
| ----------------- | -------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `title`           | `string`                                     | —            | What the document is called. Required                                                                     |
| `kind`            | `string`                                     | `"Document"` | The kind of thing it is, on the muted line under the title                                                |
| `version`         | `number`                                     | `undefined`  | Which revision is on screen, 1-based. Renders as `v3`                                                     |
| `versionCount`    | `number`                                     | `undefined`  | How many revisions exist. With `version`, the badge reads `v3/5`                                          |
| `onVersionChange` | `(version: number) => void`                  | `undefined`  | Asked for another revision by 1-based number; turns the badge into a navigator                            |
| `status`          | `"idle" \| "streaming" \| "done" \| "error"` | `"done"`     | Where the document is in its life                                                                         |
| `preview`         | `string`                                     | `undefined`  | The text so far — not the latest delta                                                                    |
| `onOpen`          | `() => void`                                 | `undefined`  | Asked to open the document; makes the whole card activatable                                              |
| `actions`         | `Snippet`                                    | `undefined`  | Buttons for the top-right rail: copy, download, delete                                                    |
| `class`           | `string`                                     | `undefined`  | Additional CSS classes                                                                                    |
| `ref`             | `HTMLDivElement \| null`                     | `null`       | Bindable reference to the root element                                                                    |
| `sound`           | `boolean`                                    | `false`      | Plays `press` when the document is opened and `select` on a version step, once the user has enabled sound |

## Streaming the preview

`preview` is the accumulated text, not the newest chunk. Reassign it with a longer string as tokens arrive and the growth is what animates — the card hands it to `StreamingText`, which tints each new chunk as it lands and trails a cursor for as long as `status` is `"streaming"`.

```svelte
<script lang="ts">
	let preview = $state("");
	let status = $state<"idle" | "streaming" | "done" | "error">("idle");

	async function write(stream: AsyncIterable<string>) {
		status = "streaming";
		for await (const chunk of stream) preview += chunk;
		status = "done";
	}
</script>

<ArtifactCard title="Q3 revenue review" {preview} {status} />
```

The preview is a teaser, capped at roughly six lines with the last one dissolving, so a cut never reads as the end of the document. `--ft-artifact-preview-height` moves the cap. Leave `preview` unset and the region is not rendered at all, which is what an `"idle"` artifact should look like: a title and nothing claimed yet.

## Versions

The card holds no version state. It renders what `version` says and asks for a different number through `onVersionChange`:

- `version` alone → a static `v3` badge.
- `version` + `versionCount` → a static `v3/5` badge.
- all three → arrows either side of `v3/5`, each disabled at its bound, each labelled for screen readers.

`onVersionChange` receives a 1-based number and never one outside `1…versionCount`, so a handler can index straight into an array of drafts without clamping first.

## Opening

Pass `onOpen` and an `Open →` button appears in the header rail. That button is the affordance: it takes a tab stop, it is named `Open <title>` so a list of cards does not read as a column of identical "Open"s, and `Enter` and `Space` work on it because it is a real `<button>`. Without `onOpen` the card is an inert region.

A click anywhere else on the card opens it too, as a pointer shortcut. That is all it is — the card root carries no `role`, no `tabindex` and no key handling, because an ARIA button makes everything inside it presentational, which would erase the version navigator, the actions rail and the spoken status from the accessibility tree.

Controls inside the card keep their own activation — a click on a version arrow, or on anything you put in `actions`, does not also open the document. Both rails are guarded whole, so the gaps between their buttons, and a disabled arrow that retargets its click, are safe too.

## Sound

Set `sound` to opt into interface cues, off by default and silent until the user has enabled sound in their own preferences:

```svelte
<ArtifactCard title="Q3 revenue review" sound onOpen={openInSidePanel} onVersionChange={goTo} />
```

`press` plays once per open — from the card-wide pointer shortcut or the Open button, never both, since a click on the button also bubbles to the card's own handler and is sent home by the same guard that keeps a version-arrow click from opening the card. `select` plays on a version step; nothing plays for a step clamped at either end. The `actions` snippet often holds a consumer's own `CopyButton` — its clicks are guarded out the same way a version arrow's are, so the card never adds a second cue on top of one it already plays. See [`sound/README.md`](../sound/README.md) for how the preference and playback work.

## Styling

Colour comes from `--ft-status-*`, the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `TerminalBlock`, `CodeDiff` and `ChatError`. Set one anywhere up the tree and every component in the family follows:

| Variable              | Default (light / dark)                         | Applies to               |
| --------------------- | ---------------------------------------------- | ------------------------ |
| `--ft-status-running` | `oklch(0.5 0.18 265)` / `oklch(0.72 0.15 265)` | The sweep, while writing |
| `--ft-status-error`   | `oklch(0.5 0.19 25)` / `oklch(0.7 0.18 25)`    | The failure footer       |

Each default is a `light-dark()` pair, because no single token clears 4.5:1 against both white and near-black. Which half applies is decided by `color-scheme`, so **your theme must declare it**:

```css
:root {
	color-scheme: light;
}
.dark {
	color-scheme: dark;
}
```

The card's own hooks sit in front of the shared ones, for the case where this surface alone should differ:

| Variable                       | Default               | Applies to                          |
| ------------------------------ | --------------------- | ----------------------------------- |
| `--ft-artifact-running`        | `--ft-status-running` | The streaming sweep on the top edge |
| `--ft-artifact-error`          | `--ft-status-error`   | The failure footer, text and tint   |
| `--ft-artifact-preview-bg`     | `currentColor` at 4%  | Background behind the preview       |
| `--ft-artifact-preview-height` | `9rem`                | Where the preview is cut off        |
| `--ft-artifact-sweep-duration` | `1.9s`                | One pass of the sweep               |

## Implementation Notes

- Status is never carried by colour alone: a failure says so in words in the footer, and an `sr-only` label beside the header names all four states ("Not started" / "Writing" / "Ready" / "Failed"). That label, the version navigator and the actions rail all stay readable because the root is never given a `role` — an ARIA button would flatten them into its own name.
- The sweep is a single gradient bar parked off the card's left edge, moved only by an animation that lives entirely inside `prefers-reduced-motion: no-preference`. Reduced motion therefore never sees it — there is no fallback to shorten, because the still state _is_ the parked one.
- The preview's fade is a `mask-image` on the clipping box, so it works over any background the card is sitting on.
- Nothing is scheduled and no DOM is touched at construction time, so the card renders under SSR unchanged.
