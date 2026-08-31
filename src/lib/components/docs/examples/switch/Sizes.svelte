<script lang="ts">
	import { Switch, type SwitchSize } from "$lib/fancy-ui/switch";

	const sizes: SwitchSize[] = ["sm", "md", "lg"];
</script>

<div class="flex flex-wrap items-center gap-6">
	{#each sizes as size (size)}
		<Switch sound {size} checked label={`Size ${size}`} />
	{/each}
</div>
