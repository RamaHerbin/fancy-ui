<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";

	const presets = ["chromatic", "silver", "gold"] as const;
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each presets as preset (preset)}
		<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
			<p class="text-muted-foreground text-center text-xs capitalize">{preset}</p>
			<GlowBorder {preset} />
		</div>
	{/each}
</div>
