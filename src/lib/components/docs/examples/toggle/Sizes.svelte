<script lang="ts">
	import { Toggle, type ToggleSize } from "$lib/fancy-ui/toggle";

	const sizes: ToggleSize[] = ["sm", "md", "lg"];
</script>

<div class="flex flex-wrap items-center gap-3">
	{#each sizes as size (size)}
		<Toggle {size} pressed label={`Size ${size}`}>
			<strong>B</strong>
		</Toggle>
	{/each}
</div>
