<script lang="ts">
	import { GlareCard } from "$lib/fancy-ui/glare-card";
</script>

<div class="flex flex-wrap justify-center gap-8">
	{#each ["Fire", "Water", "Earth"] as element, i}
		<GlareCard>
			<div class="flex size-full flex-col items-center justify-center p-6 text-white">
				<span class="mb-2 text-4xl">{["🔥", "💧", "🌍"][i]}</span>
				<h3 class="text-xl font-bold">{element}</h3>
				<p class="mt-1 text-xs text-slate-400">Elemental Card</p>
			</div>
		</GlareCard>
	{/each}
</div>
