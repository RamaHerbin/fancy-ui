<script lang="ts">
	import { Popover } from "$lib/fancy-ui/popover";

	const sides = ["top", "right", "bottom", "left"] as const;
</script>

<div class="flex flex-wrap items-center gap-6">
	{#each sides as side (side)}
		<Popover sound {side}>
			{#snippet trigger()}
				{side}
			{/snippet}
			<span class="text-popover-foreground text-[12px]">Placed on {side}</span>
		</Popover>
	{/each}
</div>
