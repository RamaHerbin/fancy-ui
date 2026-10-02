<script lang="ts">
	import BentoGrid from "./BentoGrid.svelte";
	import BentoGridItem from "./BentoGridItem.svelte";

	let { reveal = true, accent }: { reveal?: boolean; accent?: string } = $props();
</script>

<BentoGrid {reveal} {accent}>
	<BentoGridItem>
		{#snippet title()}One{/snippet}
	</BentoGridItem>
	<BentoGridItem>
		{#snippet title()}Two{/snippet}
	</BentoGridItem>
	<BentoGridItem>
		{#snippet title()}Three{/snippet}
	</BentoGridItem>
</BentoGrid>
