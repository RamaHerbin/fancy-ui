<script lang="ts">
	import { Tooltip } from "$lib/fancy-ui/tooltip";

	const sides = ["top", "right", "bottom", "left"] as const;
</script>

<div class="flex flex-wrap items-center gap-8">
	{#each sides as side (side)}
		<Tooltip content={`Placed on ${side}`} {side}>
			<button
				class="border-border text-foreground rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium"
			>
				{side}
			</button>
		</Tooltip>
	{/each}
</div>
