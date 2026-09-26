<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { FlipCard } from "$lib/fancy-ui/flip-card";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<FlipCard
		rotate={values.rotate as "x" | "y"}
		trigger={values.trigger as "hover" | "click"}
		glare={values.glare as boolean}
		duration={values.duration as number}
		class="h-40 w-64"
	>
		<!-- Ivory face on the near-black stage: the glare has a flat, bright
		     surface to travel across, which is what makes the turn read. -->
		<div
			class="flex size-full flex-col items-center justify-center gap-1"
			style="background:var(--lp-ink);color:var(--lp-bg)"
		>
			<p class="text-lg font-semibold">Front</p>
			<p class="text-xs opacity-60">Hover, focus or tap</p>
		</div>
		{#snippet back()}
			<div
				class="flex size-full flex-col items-center justify-center gap-1 border"
				style="border-color:var(--lp-line-strong);color:var(--lp-ink)"
			>
				<p class="text-base font-semibold">Back side</p>
				<p class="text-xs" style="color:var(--lp-grey-3)">Angle carries the light</p>
			</div>
		{/snippet}
	</FlipCard>
</div>
