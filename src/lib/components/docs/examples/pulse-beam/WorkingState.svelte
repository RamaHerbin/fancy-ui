<script lang="ts">
	import { PulseBeam } from "$lib/fancy-ui/pulse-beam";
	import LoaderCircle from "@lucide/svelte/icons/loader-circle";
	import Check from "@lucide/svelte/icons/check";

	const tasks = [
		"Generate color palettes",
		"Recommend font pairings",
		"Create layout templates",
		"Build section engine",
		"Generate hero variants",
	];

	let working = $state(true);
	let status = $state("fading in…");
</script>

<div class="flex flex-col items-center gap-4">
	<PulseBeam
		active={working}
		radius={20}
		class="w-full max-w-sm"
		onfadein={() => (status = "glow settled")}
		onfadeout={() => (status = "glow off, loop stopped")}
	>
		<div class="bg-card rounded-[20px] p-5">
			<p class="text-muted-foreground text-sm">
				{working ? "Working…" : "Done"}
			</p>
			<ul class="mt-4 space-y-3 text-sm">
				{#each tasks as task (task)}
					<li class="flex items-center gap-3">
						{#if working}
							<LoaderCircle class="text-muted-foreground size-4 animate-spin" />
						{:else}
							<Check class="size-4 text-emerald-500" />
						{/if}
						<span>{task}</span>
					</li>
				{/each}
			</ul>
		</div>
	</PulseBeam>

	<div class="flex items-center gap-3">
		<button
			class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
			onclick={() => (working = !working)}
		>
			{working ? "Finish" : "Start again"}
		</button>
		<span class="text-muted-foreground text-xs">{status}</span>
	</div>
</div>
