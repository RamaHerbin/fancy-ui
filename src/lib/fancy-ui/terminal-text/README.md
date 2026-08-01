# TerminalText

Streams an array of lines onto the screen character by character, terminal-style, with a blinking block cursor and an optional post-stream "glitch" effect that randomly swaps a visible character for a glyph for a moment.

## Usage

```svelte
<script lang="ts">
	import { TerminalText } from "fancy-ui-svelte";
</script>

<div class="rounded-lg border bg-black p-5 text-green-400">
	<TerminalText
		lines={[
			"[INFO]  boot sequence complete",
			"[WARN]  memory fragmentation at sector 0x4A2F",
			"[OK]    all systems nominal",
		]}
		speed={25}
	/>
</div>
```

```svelte
<!-- Glitch effect after streaming finishes, and a completion callback -->
<TerminalText lines={["Connection established."]} glitch onComplete={() => console.log("done")} />
```

## Props

| Prop         | Type         | Default | Description                                                |
| ------------ | ------------ | ------- | ---------------------------------------------------------- |
| `lines`      | `string[]`   | —       | Array of lines to stream character by character (required) |
| `speed`      | `number`     | `40`    | Delay between each character in ms                         |
| `delay`      | `number`     | `0`     | Initial delay before streaming starts, in ms               |
| `cursor`     | `boolean`    | `true`  | Show the blinking cursor                                   |
| `cursorChar` | `string`     | `"█"`   | Character used as the cursor                               |
| `glitch`     | `boolean`    | `false` | Enable random character glitching after streaming          |
| `class`      | `string`     | —       | Additional CSS classes                                     |
| `onComplete` | `() => void` | —       | Called once, after the last line finishes streaming        |

## Implementation notes

- Streaming is scheduled with a flat list of `setTimeout` calls computed up front from a running `totalDelay` counter (one timeout per character, plus a `speed * 3` pause between lines), not a single interval — every timeout is tracked and cleared together (`clearAllTimeouts`) so restarting the stream never leaves stray callbacks running.
- Streaming and glitching are two independent `$effect`s. The streaming effect depends on `lines`, `speed`, and `delay` only (`void`-read to declare the dependency without using the value), so toggling `glitch` mid-stream does not restart the text. The glitch effect depends only on `glitch` and starts/stops its own self-rescheduling loop (`scheduleGlitch`, random 2–4s interval).
- The glitch loop picks a random visible character from a random non-empty line, swaps in a random glyph from a fixed set, and restores the original character after 100ms — it checks that the same `(lineIdx, charIdx)` is still the active glitch before restoring, so it can't clobber a different glitch that started in between.
- The blinking cursor is CSS-only (`animation: blink 1s step-end infinite`) and is rendered after whichever line is currently last — while streaming that's the in-progress line, once `done` it moves to its own trailing line.
- No `prefers-reduced-motion` handling — lines always stream character-by-character and the cursor always blinks, regardless of user preference.
