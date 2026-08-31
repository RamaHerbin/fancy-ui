# Reasoning Panel

A collapsible trace that streams a model's reasoning while it thinks, then folds itself into a one-line summary — `Thought for 12s` — once it is done.

## Components

- `ReasoningPanel` — header button plus the scrollable trace it controls

## Usage

```svelte
<script>
	import { ReasoningPanel } from "fancy-ui-svelte";

	let text = $state("");
	let streaming = $state(true);
	let since = $state(Date.now());
</script>

<ReasoningPanel {text} {streaming} {since} />
```

The consumer owns the trace: append to `text` as chunks arrive and flip `streaming` to `false` when the model stops. The panel handles the rest.

## Props

| Prop         | Type                      | Default       | Description                                                           |
| ------------ | ------------------------- | ------------- | --------------------------------------------------------------------- |
| `text`       | `string`                  | —             | The reasoning trace so far. Required.                                 |
| `streaming`  | `boolean`                 | `false`       | Whether the trace is still growing                                    |
| `open`       | `boolean`                 | `undefined`   | Expanded state. Bindable — see the contract below                     |
| `label`      | `string`                  | `'Reasoning'` | Header text                                                           |
| `since`      | `number`                  | `undefined`   | Epoch ms the current burst started at; pins the live timer's origin   |
| `durationMs` | `number`                  | `undefined`   | Final duration for the summary line                                   |
| `maxHeight`  | `string`                  | `'12rem'`     | Scroll height of the trace once expanded                              |
| `onToggle`   | `(open: boolean) => void` | `undefined`   | Called on every open/close, by click or on the panel's own initiative |
| `class`      | `string`                  | `undefined`   | Additional CSS classes                                                |
| `ref`        | `HTMLDivElement \| null`  | `null`        | Bindable reference to the root element                                |
| `sound`      | `boolean`                 | `false`       | Plays `open` / `close` when the reader toggles the panel              |

## The open-behaviour contract

`open` is bindable but starts life as `undefined`, which the panel reads as _"nobody has decided yet, so I will"_. In that state:

- **A stream starts** (`streaming` flips `true`) → the panel opens.
- **A stream ends** (`streaming` flips `false`) → the panel waits 600 ms, long enough for the summary to register, then collapses.

The moment the reader clicks the header, the panel hands over for good. It will never open or close on its own again for the rest of that component's life — not on the next burst, not on the one after. This is deliberate: a panel that reopens itself after someone closed it reads as a bug, not a feature.

Every change, whichever side caused it, is written back through `open` and announced through `onToggle`. So:

- Ignore `open` entirely and you get the automatic behaviour above.
- `bind:open={expanded}` and you get the automatic behaviour _plus_ a variable that always reflects the truth.
- Write to `expanded` yourself and the panel obeys — but that does not count as a reader toggle, so the automatic behaviour stays armed. Pair it with an `onToggle` handler if you want to take over completely.

A collapse already scheduled is cancelled by a click, by a new stream starting, or by the component unmounting.

## Timing

While `streaming`, the header shows a live stopwatch driven by `createElapsed`, ticking once a second off the wall clock so a throttled background tab still reports the true duration. When the stream ends, the last reading becomes the summary duration; pass `durationMs` to override it with a server-measured one, or `since` to pin where the clock started (useful when the panel mounts mid-burst).

Each new burst restarts the clock unless `since` is supplied, so the summary describes the burst you just watched rather than the sum of all of them.

## Sound

Set `sound` to play `open` when the reader expands the trace and `close` when they fold it back, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ReasoningPanel {text} sound />
```

Only an actual click on the header plays a cue — one of `open`/`close`, never both. The panel opening on its own while streaming, folding itself away 600 ms after a stream ends, or a consumer writing straight to a bound `open` variable all stay silent: those are the panel deciding, not the reader, and the contract above is exactly the line the cue follows. Off by default; only audible once the user has separately turned sound on.

## Implementation Notes

- Expand/collapse is a one-row grid transitioning `grid-template-rows` between `0fr` and `1fr`, so `auto` height animates without measuring anything.
- The trace is scrolled by the shared `autoscroll` action, enabled only while streaming and open. It stays pinned to the bottom until the reader scrolls up to look back, then lets go.
- `StreamText` renders the trace, so newly arrived text tints and settles instead of appearing all at once.
- The collapsed body is `inert`, keeping the hidden trace out of the tab order and the accessibility tree.
- Every animation — the shimmering label, the chevron, the expand — lives behind `prefers-reduced-motion: no-preference`. Reduced motion gets the same three states, instantly.
- Nothing is scheduled during SSR: the timer and the collapse delay only exist inside effects.
