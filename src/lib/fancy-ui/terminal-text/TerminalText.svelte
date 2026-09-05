<script lang="ts" module>
	export interface TerminalTextProps {
		lines: string[];
		speed?: number;
		delay?: number;
		cursor?: boolean;
		cursorChar?: string;
		glitch?: boolean;
		class?: string;
		onComplete?: () => void;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		lines,
		speed = 40,
		delay = 0,
		cursor = true,
		cursorChar = "█",
		glitch = false,
		class: className,
		onComplete,
	}: TerminalTextProps = $props();

	const GLITCH_GLYPHS = "アイウエオ@#$%&!?░▒▓█▄▀■□▪▫";

	let displayedLines = $state<string[]>([]);
	let done = $state(false);
	let glitchState = $state<{ lineIdx: number; charIdx: number; original: string } | null>(null);

	let timeouts: ReturnType<typeof setTimeout>[] = [];

	// The glitch chain keeps its OWN handles instead of joining the stream's
	// pool: `clearAllTimeouts` runs on every lines/speed/delay change, which
	// would otherwise kill the loop's pending self-reschedule for good — the
	// glitch effect depends on `glitch` alone and never re-runs to restart it.
	let glitchLoopId: ReturnType<typeof setTimeout> | null = null;
	let glitchRestoreId: ReturnType<typeof setTimeout> | null = null;

	function stopGlitchLoop() {
		if (glitchLoopId !== null) {
			clearTimeout(glitchLoopId);
			glitchLoopId = null;
		}
		if (glitchRestoreId !== null) {
			clearTimeout(glitchRestoreId);
			glitchRestoreId = null;
		}
	}

	function scheduleTimeout(fn: () => void, ms: number) {
		const id = setTimeout(fn, ms);
		timeouts.push(id);
		return id;
	}

	function clearAllTimeouts() {
		timeouts.forEach(clearTimeout);
		timeouts = [];
	}

	function streamLines() {
		clearAllTimeouts();
		displayedLines = [];
		done = false;
		glitchState = null;

		let totalDelay = delay;

		for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
			const line = lines[lineIdx];

			// Push empty line placeholder
			const capturedIdx = lineIdx;
			scheduleTimeout(() => {
				displayedLines = [...displayedLines, ""];
			}, totalDelay);

			// Stream characters one by one
			for (let charIdx = 0; charIdx < line.length; charIdx++) {
				const capturedChar = charIdx;
				const capturedLine = line;
				totalDelay += speed;
				scheduleTimeout(() => {
					displayedLines = displayedLines.map((l, i) =>
						i === capturedIdx ? capturedLine.slice(0, capturedChar + 1) : l
					);
				}, totalDelay);
			}

			// Small pause between lines
			totalDelay += speed * 3;
		}

		// Mark done
		scheduleTimeout(() => {
			done = true;
			onComplete?.();
		}, totalDelay);
	}

	function startGlitchLoop() {
		function glitchOnce() {
			if (displayedLines.length === 0) return;

			// Pick a random line with content
			const linesWithContent = displayedLines
				.map((l, i) => ({ l, i }))
				.filter(({ l }) => l.length > 0);
			if (linesWithContent.length === 0) return;

			const { l, i } = linesWithContent[Math.floor(Math.random() * linesWithContent.length)];
			const charIdx = Math.floor(Math.random() * l.length);
			const original = l[charIdx];
			const fakeGlyph = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];

			glitchState = { lineIdx: i, charIdx, original };

			// Temporarily replace char in display via glitchState, restore after 100ms
			displayedLines = displayedLines.map((line, idx) => {
				if (idx !== i) return line;
				return line.slice(0, charIdx) + fakeGlyph + line.slice(charIdx + 1);
			});

			if (glitchRestoreId !== null) clearTimeout(glitchRestoreId);
			glitchRestoreId = setTimeout(() => {
				glitchRestoreId = null;
				if (glitchState && glitchState.lineIdx === i && glitchState.charIdx === charIdx) {
					displayedLines = displayedLines.map((line, idx) => {
						if (idx !== i) return line;
						return line.slice(0, charIdx) + original + line.slice(charIdx + 1);
					});
					glitchState = null;
				}
			}, 100);
		}

		function scheduleGlitch() {
			// Random interval between 2s and 4s
			const interval = 2000 + Math.random() * 2000;
			glitchLoopId = setTimeout(() => {
				glitchLoopId = null;
				if (glitch) glitchOnce();
				scheduleGlitch();
			}, interval);
		}

		// Never stack a second chain on top of a live one.
		stopGlitchLoop();
		scheduleGlitch();
	}

	$effect(() => {
		// React only to lines/speed/delay — changing glitch won't restart the stream
		void lines;
		void speed;
		void delay;

		streamLines();

		return () => {
			clearAllTimeouts();
		};
	});

	$effect(() => {
		// React to glitch changes without restarting the stream
		void glitch;

		if (glitch) {
			startGlitchLoop();
		} else {
			glitchState = null;
		}

		return () => {
			// Exactly one chain is ever alive: the teardown stops the current
			// one on a `glitch` flip and on unmount.
			stopGlitchLoop();
		};
	});
</script>

<div class={cn("font-mono text-sm leading-relaxed", className)}>
	{#each displayedLines as line, i}
		<div class="min-h-[1.4em]">
			<span>{line}</span>{#if cursor && i === displayedLines.length - 1 && !done}<span
					class="cursor-blink">{cursorChar}</span
				>{/if}
		</div>
	{/each}
	{#if cursor && done}
		<div class="min-h-[1.4em]">
			<span class="cursor-blink">{cursorChar}</span>
		</div>
	{/if}
</div>

<style>
	.cursor-blink {
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
</style>
