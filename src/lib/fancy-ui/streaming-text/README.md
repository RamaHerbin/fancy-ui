# StreamingText

Renders a growing string as a live token stream: whatever grew since the last update lands tinted, then settles into the surrounding paragraph over `settleMs`, with an optional soft block cursor trailing the last character while the response is still in flight.

## The contract: you push the accumulated text

`text` is **the whole text so far, not the latest delta**. Every time a chunk arrives, reassign `text` to the longer string; the component works out what is new by comparing against what it already had. A push that is not a continuation of the current text — a regenerated answer, or chunks that arrived out of order — is treated as a replacement and lands already settled, with nothing to animate from.

This matters because it makes the component stateless with respect to your transport. Server-sent events, a `fetch` reader, a websocket, or a plain array replayed on a timer all look the same from here: they all end up assigning a longer string.

## Not the same as `TerminalText`

`TerminalText` replays text **you already have**. You hand it a fixed array of lines and it reveals them character by character at a speed you choose — the timing is a presentation effect, decided by the component.

`StreamingText` renders text **you do not have yet**. The timing belongs to whatever is producing the tokens; the component only animates the fact that something arrived. Use `TerminalText` for a scripted reveal, `StreamingText` for a real response.

## Usage

```svelte
<script lang="ts">
	import { StreamingText } from "fancy-ui-svelte";

	let text = $state("");
	let streaming = $state(false);

	async function ask(prompt: string) {
		streaming = true;
		text = "";

		const res = await fetch("/api/chat", { method: "POST", body: prompt });
		const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			text += value; // reassigning the accumulated string is the whole API
		}

		streaming = false; // fires onComplete
	}
</script>

<StreamingText {text} {streaming} onComplete={() => console.log("done")} />
```

```svelte
<!-- Markdown, with a custom tint and a slower settle -->
<StreamingText {text} {streaming} markdown tintColor="#6366f1" settleMs={500} />
```

## Props

| Prop         | Type                    | Default | Description                                                              |
| ------------ | ----------------------- | ------- | ------------------------------------------------------------------------ |
| `text`       | `string`                | —       | The accumulated text so far; reassign as chunks arrive (required)        |
| `streaming`  | `boolean`               | `false` | Show a soft block cursor after the last character                        |
| `markdown`   | `boolean`               | `false` | Render as markdown instead of the tinted plain-text stream               |
| `settleMs`   | `number`                | `350`   | How long a newly arrived chunk stays tinted, in ms (plain mode only)     |
| `tintColor`  | `string`                | —       | Colour a chunk fades from, and the cursor's fill; sets `--ft-tint-color` |
| `onComplete` | `() => void`            | —       | Called once when `streaming` goes from true to false                     |
| `class`      | `string`                | —       | Additional CSS classes                                                   |
| `ref`        | `HTMLSpanElement\|null` | `null`  | The root element, bindable                                               |

## The markdown tradeoff

Plain mode and markdown mode animate differently, and the difference is not cosmetic:

- **Plain mode** splits the text into settled spans plus one fresh span per delta, so only the new characters carry the tint and the settled text is never touched. Long streams stay cheap: contiguous settled segments are merged back together, so the DOM never accumulates more than a handful of spans.
- **Markdown mode** re-parses and re-renders the entire document on every update, because a chunk can change how earlier text parses — a closing `**` retroactively turns a run of plain text into `<strong>`. There is no stable delta to tint, so **no tint is applied in markdown mode** and `settleMs` has no effect.

Pick markdown when structure matters more than the arrival cue, and keep in mind that partial markdown renders as partial markdown: a half-written code fence looks like a half-written code fence until its closing line arrives.

## Implementation notes

- The plain-text path delegates to the internal `StreamText` primitive, which owns the diffing, the fresh/settled segment bookkeeping, and the settle timers. This component is the published surface over it: cursor, completion callback, markdown switch, tint plumbing.
- `onComplete` is driven by an `$effect` that tracks the previous value of `streaming` in a plain (non-reactive) variable and only fires on the true → false edge. The variable is seeded from the initial prop inside `untrack`, so a component that mounts with `streaming` already false — a replayed transcript, for instance — never reports a completion it did not witness. The effect body is untracked so a new `onComplete` identity cannot retrigger it.
- `tintColor` sets `--ft-tint-color` on the root, which cascades into the primitive's tint keyframes. The cursor reads the same property but falls back to `currentColor` rather than the tint's blue default: an untinted stream should not grow a coloured cursor, while a tinted one reads as a single gesture.
- The cursor blink lives entirely inside `@media (prefers-reduced-motion: no-preference)`, so reduced motion gets a steady block that still marks where the next character will land. The tint animation is behind the same query in the primitive.
- SSR-safe: no timer is scheduled until the first growth, so the server renders the whole string as settled text and only later growth animates.
- The root is a `<span>`, inline by default so it can sit inside a sentence; markdown mode switches it to `display: block` because rendered markdown has block children.
