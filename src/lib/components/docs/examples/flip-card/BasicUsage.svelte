<script lang="ts">
	import { FlipCard } from "$lib/fancy-ui/flip-card";
</script>

<FlipCard>
	<div class="flex size-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
		<p class="text-2xl font-bold text-white">Front</p>
	</div>
	{#snippet back()}
		<div class="flex size-full flex-col items-center justify-center">
			<p class="text-lg font-semibold">Back Side</p>
			<p class="mt-2 text-sm text-slate-400">Hover to flip</p>
		</div>
	{/snippet}
</FlipCard>
