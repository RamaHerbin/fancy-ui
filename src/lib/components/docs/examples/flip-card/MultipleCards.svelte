<script lang="ts">
	import { FlipCard } from "$lib/fancy-ui/flip-card";
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each ["from-rose-500 to-orange-500", "from-emerald-500 to-teal-500", "from-violet-500 to-indigo-500"] as gradient, i}
		<FlipCard>
			<div class="flex size-full items-center justify-center bg-gradient-to-br {gradient}">
				<p class="text-2xl font-bold text-white">Card {i + 1}</p>
			</div>
			{#snippet back()}
				<div class="flex size-full flex-col items-center justify-center">
					<p class="text-lg font-semibold">Details #{i + 1}</p>
					<p class="mt-2 text-sm text-slate-400">More info here</p>
				</div>
			{/snippet}
		</FlipCard>
	{/each}
</div>
