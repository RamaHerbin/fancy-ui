<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import {
		DatamoshTransition,
		type DatamoshTransitionPhase,
	} from "$lib/fancy-ui/datamosh-transition";
	import type { DatamoshEffect } from "$lib/fancy-ui/datamosh-transition/datamosh-transition-core.js";

	let { values }: { values: PlaygroundValues } = $props();

	const pages = [
		{ label: "Page A", title: "Field notes", accent: "#f2c318" },
		{ label: "Page B", title: "Index of works", accent: "#7fd4ff" },
	];

	let transition: ReturnType<typeof DatamoshTransition> | undefined = $state();
	let phase: DatamoshTransitionPhase = $state("idle");
	let current = $state(0);
	const page = $derived(pages[current]);

	async function swap() {
		if (!transition || phase !== "idle") return;
		await transition.cover();
		current = (current + 1) % pages.length;
		await transition.reveal();
	}
</script>

<div class="relative flex h-full w-full flex-col overflow-hidden bg-[#060606] p-5 text-[#f2f1ec]">
	<div
		class="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-white/45"
	>
		<span>{page.label.toUpperCase()}</span>
		<span style:color={page.accent}>{String(current + 1).padStart(2, "0")} / 02</span>
	</div>
	<div class="flex flex-1 flex-col justify-center gap-2">
		<h3 class="text-2xl font-semibold tracking-tight" style:color={page.accent}>{page.title}</h3>
		<div class="flex flex-col gap-1.5" aria-hidden="true">
			<span class="h-1.5 w-4/5 rounded-full bg-white/10"></span>
			<span class="h-1.5 w-3/5 rounded-full bg-white/10"></span>
			<span class="h-1.5 w-2/3 rounded-full bg-white/10"></span>
		</div>
	</div>
	<button
		type="button"
		class="self-start rounded-full bg-[#f2f1ec] px-3.5 py-1.5 text-xs font-medium text-[#060606] transition-opacity disabled:opacity-50"
		onclick={swap}
		disabled={phase !== "idle"}
	>
		Swap page
	</button>
	<DatamoshTransition
		bind:this={transition}
		bind:phase
		contained
		variant={values.variant as DatamoshEffect}
		speed={values.speed as number}
	/>
</div>
