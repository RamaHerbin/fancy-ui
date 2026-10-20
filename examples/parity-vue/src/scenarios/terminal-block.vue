<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/terminal-block/BasicUsage.svelte.
import { onMounted, onBeforeUnmount, ref } from "vue";
import { TerminalBlock } from "fancy-ui-vue";

const ESC = "\u001b";
const green = (text: string) => `${ESC}[32m${text}${ESC}[0m`;
const yellow = (text: string) => `${ESC}[33m${text}${ESC}[0m`;
const cyan = (text: string) => `${ESC}[36m${text}${ESC}[0m`;
const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;

const TRANSCRIPT: { text: string; wait: number }[] = [
	{ text: `${bold("building for production…")}`, wait: 700 },
	{ text: `${green("✓")} 214 modules transformed`, wait: 900 },
	{ text: `${yellow("warning:")} "createElapsed" is exported but never used`, wait: 500 },
	{ text: `${cyan("build/entry.js")}      12.4 kB │ gzip:  4.1 kB`, wait: 260 },
	{ text: `${cyan("build/app.js")}        94.7 kB │ gzip: 28.9 kB`, wait: 260 },
	{ text: `${cyan("build/styles.css")}     8.2 kB │ gzip:  2.3 kB`, wait: 420 },
	{ text: `${green("✓")} built in ${bold("3.42s")}`, wait: 600 },
];

const FULL = TRANSCRIPT.map((line) => line.text).join("\n") + "\n";
const DURATION_MS = 3420;
const REPLAY_PAUSE = 3200;

const output = ref("");
const running = ref(false);
const exitCode = ref<number | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		output.value = FULL;
		exitCode.value = 0;
		return;
	}

	let i = 0;

	function tick() {
		if (i < TRANSCRIPT.length) {
			output.value += `${TRANSCRIPT[i].text}\n`;
			const wait = TRANSCRIPT[i].wait;
			i += 1;
			timer = setTimeout(tick, wait);
			return;
		}
		running.value = false;
		exitCode.value = 0;
		timer = setTimeout(restart, REPLAY_PAUSE);
	}

	function restart() {
		output.value = "";
		exitCode.value = null;
		running.value = true;
		i = 0;
		timer = setTimeout(tick, 500);
	}

	restart();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<div class="w-full max-w-2xl">
		<TerminalBlock
			command="pnpm build"
			:output="output"
			:running="running"
			:exit-code="exitCode"
			:duration-ms="exitCode === null ? undefined : DURATION_MS"
			max-height="15rem"
		>
			<template #header>
				<span class="flex items-center gap-1.5" aria-hidden="true">
					<span class="size-2.5 rounded-full bg-red-400/90"></span>
					<span class="size-2.5 rounded-full bg-amber-400/90"></span>
					<span class="size-2.5 rounded-full bg-emerald-400/90"></span>
				</span>
				<span class="ml-auto text-xs opacity-60">build.log</span>
			</template>
		</TerminalBlock>
	</div>
</template>
