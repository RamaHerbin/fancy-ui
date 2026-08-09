<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	let view = $state("day");
</script>

<div class="flex flex-col items-start gap-2">
	<ToggleGroup bind:value={view} label="Calendar view">
		<ToggleGroupItem value="day">Day</ToggleGroupItem>
		<ToggleGroupItem value="week">Week</ToggleGroupItem>
		<ToggleGroupItem value="month">Month</ToggleGroupItem>
	</ToggleGroup>

	<!-- Activating the active item again clears it — the one state a native
	     radio group cannot express. -->
	<p class="text-muted-foreground text-sm">
		{view === ""
			? "No view selected — click one, then click it again to clear it."
			: `Showing the ${view} view.`}
	</p>
</div>
