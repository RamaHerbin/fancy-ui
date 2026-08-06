<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for TerminalBlock
	 */
	export interface TerminalBlockProps {
		/** Everything the command has printed so far, not the latest chunk. Reassign as lines arrive. */
		output: string;
		/** The command that produced the output, shown on the first line after the prompt glyph. */
		command?: string;
		/** Prompt glyph in front of the command. */
		prompt?: string;
		/** Whether the command is still running. Shows the cursor and keeps the view pinned. */
		running?: boolean;
		/** Exit status. Anything other than null or undefined ends the run and shows the footer. */
		exitCode?: number | null;
		/** How long the run took, shown next to the exit status. */
		durationMs?: number;
		/** Read the SGR subset and colour the output. False renders the same text, unstyled. */
		ansi?: boolean;
		/** Height at which the output starts scrolling. */
		maxHeight?: string;
		/** Title bar above the output — window dots, a file name, a copy button. */
		header?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { autoscroll } from "../_internals/autoscroll.js";
	import { parseAnsi, type AnsiSegment } from "./ansi.js";

	let {
		output,
		command,
		prompt = "$",
		running = false,
		exitCode = null,
		durationMs,
		ansi = true,
		maxHeight = "20rem",
		header,
		class: className,
		ref = $bindable(null),
	}: TerminalBlockProps = $props();

	/**
	 * The palette a consumer overrides by setting `--ft-terminal-*` anywhere above
	 * the block. Each entry is the readable-on-dark version of its colour, which
	 * is also why the bright SGR codes fold onto the same eight values.
	 */
	const FALLBACK: Record<string, string> = {
		"--ft-terminal-black": "oklch(0.44 0.01 260)",
		"--ft-terminal-red": "oklch(0.7 0.18 22)",
		"--ft-terminal-green": "oklch(0.78 0.17 150)",
		"--ft-terminal-yellow": "oklch(0.85 0.15 90)",
		"--ft-terminal-blue": "oklch(0.74 0.13 250)",
		"--ft-terminal-magenta": "oklch(0.74 0.18 330)",
		"--ft-terminal-cyan": "oklch(0.82 0.11 200)",
		"--ft-terminal-white": "oklch(0.95 0.005 260)",
	};

	const finished = $derived(exitCode !== null && exitCode !== undefined);
	const ok = $derived(exitCode === 0);
	const duration = $derived(formatDuration(durationMs));

	const rows = $derived.by(() => {
		const lines = toRows(output, ansi);
		// A stream that has printed nothing yet still needs a line to put the
		// cursor on; a finished one should not end on a blank line just because
		// its last write ended in a newline.
		if (lines.length === 0) return running ? [[]] : [];
		const last = lines[lines.length - 1];
		if (!running && lines.length > 1 && last.length === 0) lines.pop();
		return lines;
	});

	/**
	 * Parse once over the whole stream, then cut the segments at the newlines:
	 * a colour opened on one line and closed three lines later stays in effect
	 * for the lines in between, the way a terminal would show it.
	 */
	function toRows(src: string, styled: boolean): AnsiSegment[][] {
		if (src === "") return [];
		// CRLF becomes one newline; a lone CR is dropped rather than rewinding
		// the line, so a progress bar collapses instead of exploding into rows.
		const normalized = src.replace(/\r\n/g, "\n").replace(/\r/g, "");
		const lines: AnsiSegment[][] = [[]];
		for (const segment of parseAnsi(normalized)) {
			const parts = segment.text.split("\n");
			for (let i = 0; i < parts.length; i++) {
				if (i > 0) lines.push([]);
				if (parts[i] === "") continue;
				lines[lines.length - 1].push({
					text: parts[i],
					bold: styled && segment.bold,
					fg: styled ? segment.fg : null,
				});
			}
		}
		return lines;
	}

	function colour(fg: string | null): string | undefined {
		if (fg === null) return undefined;
		return `var(${fg}, ${FALLBACK[fg] ?? "inherit"})`;
	}

	/**
	 * Command durations live in the sub-second range often enough that a
	 * stopwatch reading of "0s" would be the wrong answer most of the time.
	 */
	function formatDuration(ms: number | undefined): string | null {
		if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
		if (ms < 1000) return `${Math.round(ms)}ms`;
		if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
		const minutes = Math.floor(ms / 60_000);
		const seconds = Math.round((ms % 60_000) / 1000);
		return `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
	}
</script>

<div
	bind:this={ref}
	class={cn("ft-terminal overflow-hidden rounded-lg font-mono text-sm", className)}
>
	{#if header}
		<div class="ft-rule flex items-center gap-2 border-b px-4 py-2">{@render header()}</div>
	{/if}

	<div
		role="log"
		class="overflow-y-auto px-4 py-3 leading-relaxed"
		style:max-height={maxHeight}
		use:autoscroll={{ enabled: running }}
	>
		{#if command}
			<div class="ft-line flex gap-2">
				<span class="ft-prompt shrink-0 select-none" aria-hidden="true">{prompt}</span>
				<span class="ft-wrap">{command}</span>
			</div>
		{/if}
		{#each rows as segments, row (row)}
			<div class="ft-line ft-wrap">
				{#each segments as segment, i (i)}<span
						class:ft-bold={segment.bold}
						style:color={colour(segment.fg)}>{segment.text}</span
					>{/each}{#if running && row === rows.length - 1}<span class="ft-cursor" aria-hidden="true"
						>▊</span
					>{/if}
			</div>
		{/each}
	</div>

	{#if finished}
		<div
			role="status"
			class="ft-rule ft-status flex items-center gap-2 border-t px-4 py-2 text-xs"
			class:ft-ok={ok}
		>
			<span aria-hidden="true">{ok ? "✓" : "✗"}</span>
			<span>exited {exitCode}</span>
			{#if duration}
				<span class="ft-muted ml-auto tabular-nums">{duration}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	/*
	 * A terminal is dark in a light page too, so the surface is its own colour
	 * rather than the theme's. Everything inside inherits from it — including
	 * `color-scheme`, which is declared dark for exactly that reason: the shared
	 * `--ft-status-*` fallbacks are `light-dark()` pairs, and on this surface the
	 * dark half is the legible one whatever the page around it is doing.
	 */
	.ft-terminal {
		color-scheme: dark;
		background-color: var(--ft-terminal-bg, oklch(0.18 0.02 260));
		color: var(--ft-terminal-fg, oklch(0.92 0.01 260));
	}

	.ft-rule {
		border-color: color-mix(in oklab, currentColor 16%, transparent);
	}

	.ft-prompt {
		color: var(--ft-terminal-green, oklch(0.78 0.17 150));
	}

	/* Output is preformatted, but a long line wraps rather than scrolling sideways. */
	.ft-wrap {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* Keeps a blank line the height of a written one. Matches leading-relaxed. */
	.ft-line {
		min-height: 1.625em;
	}

	.ft-bold {
		font-weight: 700;
	}

	.ft-cursor {
		display: inline-block;
		opacity: 0.85;
	}

	/*
	 * The exit verdict is a status, not terminal output: it reads off the
	 * `--ft-status-*` vocabulary this component family shares rather than the ANSI
	 * palette above, so a run that failed here looks like a failure everywhere else.
	 */
	.ft-status {
		color: var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)));
	}

	.ft-status.ft-ok {
		color: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	}

	.ft-muted {
		color: var(--ft-terminal-fg, oklch(0.92 0.01 260));
		opacity: 0.55;
	}

	/*
	 * The cursor is a steady block first and a blinking one second: reduced
	 * motion still gets the "this is still running" signal, without the blink.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-cursor {
			animation: ft-terminal-cursor 1.1s step-end infinite;
		}

		@keyframes ft-terminal-cursor {
			0%,
			100% {
				opacity: 0.85;
			}
			50% {
				opacity: 0;
			}
		}
	}
</style>
