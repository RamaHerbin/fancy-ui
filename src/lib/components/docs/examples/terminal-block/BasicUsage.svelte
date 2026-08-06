<script lang="ts">
	import { onMount } from "svelte";
	import { TerminalBlock } from "$lib/fancy-ui/terminal-block";

	// Real output arrives with the escape sequences already in it; these just
	// spare the transcript below from spelling them out on every line.
	const ESC = "\u001b";
	const green = (text: string) => `${ESC}[32m${text}${ESC}[0m`;
	const yellow = (text: string) => `${ESC}[33m${text}${ESC}[0m`;
	const cyan = (text: string) => `${ESC}[36m${text}${ESC}[0m`;
	const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;

	/** Each line, and how long the build "spends" before printing the next one. */
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

	let output = $state("");
	let running = $state(false);
	let exitCode = $state<number | null>(null);

	onMount(() => {
		// A terminal that retypes itself forever is what reduced motion is asking
		// us not to do, so it gets the finished transcript instead.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			output = FULL;
			exitCode = 0;
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < TRANSCRIPT.length) {
				// The whole stream so far, never just the new line — that is the contract.
				output += `${TRANSCRIPT[i].text}\n`;
				const wait = TRANSCRIPT[i].wait;
				i += 1;
				timer = setTimeout(tick, wait);
				return;
			}
			running = false;
			exitCode = 0;
			timer = setTimeout(restart, REPLAY_PAUSE);
		}

		function restart() {
			output = "";
			exitCode = null;
			running = true;
			i = 0;
			timer = setTimeout(tick, 500);
		}

		restart();
		return () => clearTimeout(timer);
	});
</script>

<div class="w-full max-w-2xl">
	<TerminalBlock
		command="pnpm build"
		{output}
		{running}
		{exitCode}
		durationMs={exitCode === null ? undefined : DURATION_MS}
		maxHeight="15rem"
	>
		{#snippet header()}
			<span class="flex items-center gap-1.5" aria-hidden="true">
				<span class="size-2.5 rounded-full bg-red-400/90"></span>
				<span class="size-2.5 rounded-full bg-amber-400/90"></span>
				<span class="size-2.5 rounded-full bg-emerald-400/90"></span>
			</span>
			<span class="ml-auto text-xs opacity-60">build.log</span>
		{/snippet}
	</TerminalBlock>
</div>
