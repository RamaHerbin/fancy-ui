<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TerminalTextProps {
	lines: string[];
	speed?: number;
	delay?: number;
	cursor?: boolean;
	cursorChar?: string;
	glitch?: boolean;
	class?: HTMLAttributes["class"];
	onComplete?: () => void;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cn } from "../../utils.js";

defineOptions({ name: "TerminalText", inheritAttrs: false });

const {
	lines,
	speed = 40,
	delay = 0,
	cursor = true,
	cursorChar = "█",
	glitch = false,
	class: className,
	onComplete,
} = defineProps<TerminalTextProps>();

const GLITCH_GLYPHS = "アイウエオ@#$%&!?░▒▓█▄▀■□▪▫";

const displayedLines = ref<string[]>([]);
const done = ref(false);
const glitchState = ref<{ lineIdx: number; charIdx: number; original: string } | null>(null);

let timeouts: ReturnType<typeof setTimeout>[] = [];

// The glitch chain keeps its OWN handles instead of joining the stream's
// pool: `clearAllTimeouts` runs on every lines/speed/delay change, which
// would otherwise kill the loop's pending self-reschedule for good — the
// glitch watcher depends on `glitch` alone and never re-runs to restart it.
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
	displayedLines.value = [];
	done.value = false;
	glitchState.value = null;

	let totalDelay = delay;

	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx]!;

		const capturedIdx = lineIdx;
		scheduleTimeout(() => {
			displayedLines.value = [...displayedLines.value, ""];
		}, totalDelay);

		for (let charIdx = 0; charIdx < line.length; charIdx++) {
			const capturedChar = charIdx;
			const capturedLine = line;
			totalDelay += speed;
			scheduleTimeout(() => {
				displayedLines.value = displayedLines.value.map((l, i) =>
					i === capturedIdx ? capturedLine.slice(0, capturedChar + 1) : l
				);
			}, totalDelay);
		}

		totalDelay += speed * 3;
	}

	scheduleTimeout(() => {
		done.value = true;
		onComplete?.();
	}, totalDelay);
}

function startGlitchLoop() {
	function glitchOnce() {
		if (displayedLines.value.length === 0) return;

		const linesWithContent = displayedLines.value
			.map((l, i) => ({ l, i }))
			.filter(({ l }) => l.length > 0);
		if (linesWithContent.length === 0) return;

		const { l, i } = linesWithContent[Math.floor(Math.random() * linesWithContent.length)]!;
		const charIdx = Math.floor(Math.random() * l.length);
		const original = l[charIdx]!;
		const fakeGlyph = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]!;

		glitchState.value = { lineIdx: i, charIdx, original };

		displayedLines.value = displayedLines.value.map((line, idx) => {
			if (idx !== i) return line;
			return line.slice(0, charIdx) + fakeGlyph + line.slice(charIdx + 1);
		});

		if (glitchRestoreId !== null) clearTimeout(glitchRestoreId);
		glitchRestoreId = setTimeout(() => {
			glitchRestoreId = null;
			if (
				glitchState.value &&
				glitchState.value.lineIdx === i &&
				glitchState.value.charIdx === charIdx
			) {
				displayedLines.value = displayedLines.value.map((line, idx) => {
					if (idx !== i) return line;
					return line.slice(0, charIdx) + original + line.slice(charIdx + 1);
				});
				glitchState.value = null;
			}
		}, 100);
	}

	function scheduleGlitch() {
		const interval = 2000 + Math.random() * 2000;
		glitchLoopId = setTimeout(() => {
			glitchLoopId = null;
			if (glitch) glitchOnce();
			scheduleGlitch();
		}, interval);
	}

	stopGlitchLoop();
	scheduleGlitch();
}

// The source's two `$effect`s run their first pass after mount and never on
// the server. An `immediate` watcher would instead run inside `setup`, which
// SSR executes — scheduling timers, calling `Math.random` and firing
// `onComplete` in the render process. The first pass therefore lives in
// `onMounted`, and each watcher covers only the re-runs, post-flush.
onMounted(() => {
	// First pass of the streaming effect.
	streamLines();

	// First pass of the glitch effect (the `else` branch clears `glitchState`,
	// which is already null at mount).
	if (glitch) startGlitchLoop();
});

// React only to lines/speed/delay — changing glitch won't restart the stream.
//
// The stream is keyed on the CONTENT of `lines`, never on the array itself.
// The array is an identity that a call site like `:lines="['a', 'b']"`
// re-allocates on every parent render; keying the watcher on it would clear
// the pending timeouts, wipe the typed-out text and restart the whole
// animation each time the parent re-renders. The source restarts only when a
// tracked value really changes, and an inline literal in a Svelte template is
// not one. Serialised rather than joined, so `['ab']` and `['a', 'b']` —
// which stream differently — never collide on the same key. Reading the
// elements also tracks them, so an in-place mutation of a reactive array
// restarts the stream the way the source's tracked index reads do.
//
// Three getters, not one getter returning a tuple: Vue compares a
// multi-source watcher element-wise, where a returned array is a fresh
// identity every pass and would fire the callback unconditionally.
watch(
	[() => JSON.stringify(lines), () => speed, () => delay],
	() => {
		// The source's teardown (`clearAllTimeouts`) is the first thing
		// `streamLines` does, so the re-run order is preserved.
		streamLines();
	},
	{ flush: "post" }
);

// React to glitch changes without restarting the stream.
watch(
	() => glitch,
	(value) => {
		// Teardown of the previous pass, then the body — the source's order.
		// Exactly one chain is ever alive.
		stopGlitchLoop();
		if (value) {
			startGlitchLoop();
		} else {
			glitchState.value = null;
		}
	},
	{ flush: "post" }
);

onBeforeUnmount(() => {
	clearAllTimeouts();
	stopGlitchLoop();
});
</script>

<template>
	<div :class="cn('font-mono text-sm leading-relaxed', className)">
		<div v-for="(line, i) in displayedLines" :key="i" class="min-h-[1.4em]">
			<span>{{ line }}</span
			><span v-if="cursor && i === displayedLines.length - 1 && !done" class="cursor-blink">{{
				cursorChar
			}}</span>
		</div>
		<div v-if="cursor && done" class="min-h-[1.4em]">
			<span class="cursor-blink">{{ cursorChar }}</span>
		</div>
	</div>
</template>

<style scoped>
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
