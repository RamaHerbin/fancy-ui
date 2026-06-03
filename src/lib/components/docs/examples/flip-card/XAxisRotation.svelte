<script lang="ts">
	import { FlipCard } from "$lib/fancy-ui/flip-card";
</script>

<FlipCard rotate="x">
	<div
		class="flex size-full items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500"
	>
		<p class="text-2xl font-bold text-white">Front</p>
	</div>
	{#snippet back()}
		<div class="flex size-full flex-col items-center justify-center">
			<p class="text-lg font-semibold">Flipped vertically!</p>
			<p class="mt-2 text-sm text-slate-400">rotate="x"</p>
		</div>
	{/snippet}
</FlipCard>
