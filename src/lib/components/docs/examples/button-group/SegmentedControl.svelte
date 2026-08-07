<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { ButtonGroup } from "$lib/fancy-ui/button-group";

	const ranges = ["Day", "Week", "Month"];
	let active = $state("Day");
</script>

<ButtonGroup label="Time range">
	{#each ranges as range (range)}
		<Button variant={range === active ? "secondary" : "ghost"} onclick={() => (active = range)}>
			{range}
		</Button>
	{/each}
</ButtonGroup>
