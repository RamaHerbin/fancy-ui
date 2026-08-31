<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";

	const sizes = [
		{ value: "sm", label: "Small" },
		{ value: "md", label: "Medium" },
		{ value: "lg", label: "Large" },
	];

	const sides = ["top", "right", "bottom", "left"] as const;
</script>

<div class="flex flex-wrap items-center gap-6">
	{#each sides as side (side)}
		<Select sound options={sizes} placeholder={side} {side} class="w-[140px]" />
	{/each}
</div>
