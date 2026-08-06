# ThinkingIndicator

A live agent status line: what the agent is doing right now, shimmering while it works, next to how long it has been at it.

The same component covers two shapes that usually get written twice. `variant="inline"` is a bare text row for a transcript; `variant="pill"` is a bordered chip with a leading pulse dot — the "agent status pill" that sits in a header or above a composer. Only the presentation differs; the status text, timer, and accessibility behaviour are identical.

## Usage

```svelte
<script lang="ts">
	import { ThinkingIndicator } from "fancy-ui-svelte";

	const startedAt = Date.now();
</script>

<!-- Live: shimmering label, timer ticking up from `since` -->
<ThinkingIndicator status="Reading files" since={startedAt} />

<!-- The status pill -->
<ThinkingIndicator variant="pill" status="Searching the web" since={startedAt} />
```

```svelte
<!-- Finished: no shimmer, and the `done` snippet replaces the status label -->
<ThinkingIndicator status="Reading files" running={false} showElapsed={false}>
	{#snippet done()}
		Thought for 12s
	{/snippet}
</ThinkingIndicator>
```

## Props

| Prop          | Type                   | Default    | Description                                                              |
| ------------- | ---------------------- | ---------- | ------------------------------------------------------------------------ |
| `status`      | `string`               | —          | What the agent is doing right now, e.g. `"Reading files"` (required)     |
| `running`     | `boolean`              | `true`     | Whether the activity is in flight: drives the shimmer and the live timer |
| `variant`     | `"inline" \| "pill"`   | `"inline"` | Bare text row, or a bordered chip with a leading pulse dot               |
| `since`       | `number`               | —          | Epoch ms the activity started; the internal stopwatch ticks from it      |
| `elapsedMs`   | `number`               | —          | Externally-driven elapsed time in ms; overrides the internal stopwatch   |
| `showElapsed` | `boolean`              | `true`     | Show the elapsed duration                                                |
| `done`        | `Snippet`              | —          | Rendered instead of the status label once `running` is false             |
| `class`       | `string`               | —          | Additional CSS classes                                                   |
| `ref`         | `HTMLDivElement\|null` | `null`     | Bindable element reference                                               |

## Elapsed time: two contracts, one display

There are two ways to fill the duration, and they are mutually exclusive by design:

- **`since`** hands the clock to the component. It runs its own stopwatch (`createElapsed` from `_internals/elapsed.svelte.ts`), which re-reads `Date.now() - since` on every tick rather than accumulating, so a backgrounded tab that fires one interval instead of sixty still reports the true duration.
- **`elapsedMs`** keeps the clock outside. When it is set the internal stopwatch never starts — no interval is created at all — and the component is a pure function of its props. This is the path to use when a store, a server stream, or a parent list already owns the timing.

Passing both is not an error; `elapsedMs` simply wins. Passing neither hides the duration entirely, whatever `showElapsed` says.

One consequence worth knowing: the internal stopwatch **freezes at its last tick** when `running` flips to false — it does not re-read the clock on the way down, so a finished row keeps the duration it had at the moment it stopped. A row that mounts already finished (`running={false}` with only `since`) therefore has nothing to freeze and shows `0s`. For a finished activity rendered from scratch, pass `elapsedMs` or render the duration yourself through the `done` snippet.

## Implementation notes

- The stopwatch lives entirely inside one `$effect`, whose whole body is `if (running && since !== undefined && elapsedMs === undefined) return elapsed.start(since)`. `start()` returns its own stop function, so the effect's cleanup and the timer teardown are the same object: flipping `running` off, switching to an external `elapsedMs`, or changing `since` each tears down the interval before the next run creates one. Nothing is scheduled during SSR, where effects never run.
- The stopwatch is built with `untrack(() => createElapsed({ since }))` so the first client paint already shows the real duration instead of flashing `0s` — only that first `since` is read at construction; every later change goes through `start()`.
- The shimmer is a `background-clip: text` gradient sweep over the label, and the pulse dot is a scaling `::after` ring. Both rules live entirely inside `@media (prefers-reduced-motion: no-preference)`, so reduced motion is not a degraded variant that has to be kept in sync: with the rules gone the label is plain text at its normal colour and the dot is simply a dot.
- Shimmer colours are expressed relative to `currentColor` (`--ft-thinking-shimmer-base` is a `color-mix` fade of it, `--ft-thinking-shimmer-highlight` is `currentColor` itself), so one set of values reads correctly in both light and dark themes. `--ft-thinking-shimmer-duration` and `--ft-thinking-pulse-duration` are overridable on the root.
- The row is a `role="status"` / `aria-live="polite"` region. The ticking `<time>` carries `aria-hidden="true"` **while running**, because a per-second counter inside a polite live region would otherwise be announced once per second; it becomes readable again the moment the activity stops. The `datetime` attribute is an ISO 8601 duration (`PT65S`), so the value is machine-readable rather than decorative.
- Conditional styling hooks (`ft-thinking-shimmer`, `ft-thinking-dot-live`) are applied with `class:` directives rather than through `cn()`, so the Svelte compiler can see the classes are used and does not prune their scoped rules.
