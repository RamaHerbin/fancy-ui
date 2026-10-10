<script lang="ts">
	import { onMount } from "svelte";
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { ReasoningPanel } from "$lib/fancy-ui/reasoning-panel";

	let { values }: { values: PlaygroundValues } = $props();

	const TRACE = [
		"The orders table only stores a city, so I need the city → region mapping first.",
		" The regions lookup has a city_id foreign key — that joins cleanly.",
		" Cities with no region row would vanish under an inner join.",
		" A left join keeps them and buckets them as “Unassigned”.",
	];

	let text = $state("");
	let streaming = $state(false);
	let since = $state<number | undefined>(undefined);

	onMount(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			text = TRACE.join("");
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;

		function tick() {
			if (i < TRACE.length) {
				text += TRACE[i];
				i += 1;
				timer = setTimeout(tick, 520);
				return;
			}
			streaming = false;
			timer = setTimeout(restart, 2600);
		}

		function restart() {
			text = "";
			i = 0;
			streaming = true;
			since = Date.now();
			timer = setTimeout(tick, 200);
		}

		restart();
		return () => clearTimeout(timer);
	});
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<ReasoningPanel
		{text}
		{streaming}
		{since}
		label={values.label as string}
		maxHeight="7rem"
		class="w-full max-w-[340px]"
	/>
</div>
