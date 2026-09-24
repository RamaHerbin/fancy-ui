<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";

	const levels = [0.3, 0.8, 1];
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each levels as strength (strength)}
		<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
			<p class="text-muted-foreground text-center text-xs">strength {strength}</p>
			<GlowBorder {strength} />
		</div>
	{/each}
</div>
