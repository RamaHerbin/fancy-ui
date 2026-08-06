# Terminal Block

A live command transcript: the prompt line, the output as it arrives, a block cursor while the command runs, and an exit status once it stops. ANSI colours in the stream are read and rendered.

## Components

- `TerminalBlock` — the whole block: header, scrolling output, exit footer

## Not to be confused with `TerminalText`

The two look alike and behave nothing alike. Pick by what you have in hand:

|             | `TerminalBlock`                                         | `TerminalText`                                                  |
| ----------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Input       | `output: string`, a stream you keep appending to        | `lines: string[]`, known up front                               |
| Time        | Text appears when _you_ append it                       | Text is typed out char by char on a schedule the component owns |
| A new value | Appends; what is already on screen stays                | Restarts the whole animation from an empty screen               |
| ANSI        | Parsed and coloured                                     | Rendered as literal characters                                  |
| Status      | Cursor while `running`, `✓ exited 0` footer when done   | No notion of running or finishing, beyond `onComplete`          |
| Use it for  | A real command, an agent's shell tool call, a build log | Set dressing: a hero animation, a fake boot sequence            |

So: something actually ran → `TerminalBlock`. Nothing ran and you want the typing effect → `TerminalText`.

## Usage

```svelte
<script lang="ts">
	import { TerminalBlock } from "fancy-ui-svelte";

	let output = $state("");
	let running = $state(true);
	let exitCode = $state<number | null>(null);
</script>

<TerminalBlock command="pnpm build" {output} {running} {exitCode} durationMs={3420} />
```

The consumer owns the stream: append to `output` as chunks arrive, then flip `running` to `false` and set `exitCode` when the process exits. Append, never replace — `output` is everything printed so far, not the latest chunk.

```svelte
<!-- A title bar: window dots, a file name, a copy button — anything -->
<TerminalBlock {output} running>
	{#snippet header()}
		<span class="ml-auto text-xs opacity-60">build.log</span>
	{/snippet}
</TerminalBlock>
```

## Props

| Prop         | Type                     | Default     | Description                                                              |
| ------------ | ------------------------ | ----------- | ------------------------------------------------------------------------ |
| `output`     | `string`                 | —           | Everything the command has printed so far. Required                      |
| `command`    | `string`                 | `undefined` | Shown on the first line, after the prompt glyph                          |
| `prompt`     | `string`                 | `'$'`       | Prompt glyph in front of the command                                     |
| `running`    | `boolean`                | `false`     | Whether the command is still running: shows the cursor, pins the scroll  |
| `exitCode`   | `number \| null`         | `null`      | Anything other than `null`/`undefined` ends the run and shows the footer |
| `durationMs` | `number`                 | `undefined` | How long the run took, shown next to the exit status                     |
| `ansi`       | `boolean`                | `true`      | Read the SGR subset and colour the output                                |
| `maxHeight`  | `string`                 | `'20rem'`   | Height at which the output starts scrolling                              |
| `header`     | `Snippet`                | `undefined` | Title bar above the output                                               |
| `class`      | `string`                 | `undefined` | Additional CSS classes                                                   |
| `ref`        | `HTMLDivElement \| null` | `null`      | Bindable reference to the root element                                   |

## ANSI

Output is parsed into an array of styled text runs, never into a string of HTML, so a sequence can only ever become a colour or nothing at all.

| Sequence            | Effect                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `ESC[0m`, `ESC[m`   | Reset — clears bold and colour                                    |
| `ESC[1m`            | Bold                                                              |
| `ESC[30m`–`ESC[37m` | Foreground: black, red, green, yellow, blue, magenta, cyan, white |
| `ESC[90m`–`ESC[97m` | The same eight, bright                                            |
| `ESC[1;32m`         | Compound — every parameter is applied in order                    |
| Anything else       | Stripped, leaving no trace in the text                            |

"Anything else" is everything: cursor moves, erase-line, OSC window titles, background colours, 256-colour and truecolour, underline, and a sequence cut off mid-write by the end of the stream. Bright codes fold onto the same eight variables rather than doubling the palette — on a dark surface the normal set is already the readable one.

`ansi={false}` does not mean "render the escapes". Sequences are still stripped — nobody wants `ESC[32m` on screen — the colours are simply not applied.

Attributes carry across line breaks: a colour opened on one line and reset three lines later applies to the lines in between, the way a terminal would show it.

## Styling

The surface is dark in a light page too, because terminals are. Every colour is a CSS variable with a built-in fallback, so overriding one anywhere above the block is enough:

| Variable                                                         | Purpose                        |
| ---------------------------------------------------------------- | ------------------------------ |
| `--ft-terminal-bg`                                               | Surface behind the whole block |
| `--ft-terminal-fg`                                               | Default text, and the cursor   |
| `--ft-terminal-{black,red,green,yellow,blue,magenta,cyan,white}` | The eight ANSI foregrounds     |

`--ft-terminal-green` doubles as the prompt glyph's colour.

The exit footer's `✓`/`✗` is a status rather than terminal output, so it reads off `--ft-status-done` and `--ft-status-error` — the run-status vocabulary shared with `ToolCall`, `ToolTimeline`, `CodeDiff` and `ChatError` — and not off the ANSI palette. Recolour those and a run that failed here looks like a failure everywhere else. See the [ToolCall README](../tool-call/README.md#styling) for the full palette.

Those defaults are `light-dark()` pairs, and the block declares `color-scheme: dark` on its own root so they resolve to the dark half here whatever the page around it is doing. That is the point of the declaration: this surface is near-black in a light page too, so the light half — tuned for white — would be the wrong choice on it. Setting `--ft-status-done` or `--ft-status-error` to a flat colour overrides both halves, so pick one that reads on a dark surface.

## Implementation Notes

- The scrolling region is `role="log"`: additions are announced politely and only the new lines are read, where `aria-live` on the same element would re-read the whole transcript on every chunk.
- The shared `autoscroll` action keeps the view pinned to the bottom while `running`, and lets go the moment the reader scrolls up to look back.
- The stream is parsed once and then cut at the newlines, rather than parsed line by line, which is what lets an unclosed colour span several lines.
- `\r\n` becomes one line break; a lone `\r` is dropped rather than rewinding the line, so a progress bar collapses onto one line instead of exploding into hundreds.
- A trailing newline leaves an empty row for the cursor to sit on while running, and that row is dropped once the run is over so the footer does not float below a blank line.
- The cursor is a steady block first and a blinking one second: the blink lives behind `prefers-reduced-motion: no-preference`, so reduced motion still gets the "this is running" signal without the flashing.
- Durations under a second are reported in milliseconds (`340ms`), not rounded to `0s`; non-finite or negative values are left out entirely.
- Nothing is scheduled or measured at render time, and no browser API is touched outside the action, so the block server-renders as-is.
