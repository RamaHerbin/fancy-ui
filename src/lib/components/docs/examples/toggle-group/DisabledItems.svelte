<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	let plan = $state("starter");
</script>

<div class="flex flex-col items-start gap-2">
	<ToggleGroup sound bind:value={plan} label="Plan">
		<ToggleGroupItem value="starter">Starter</ToggleGroupItem>
		<ToggleGroupItem value="team" disabled>Team</ToggleGroupItem>
		<ToggleGroupItem value="enterprise">Enterprise</ToggleGroupItem>
	</ToggleGroup>
	<p class="text-muted-foreground text-sm">
		"Team" is unavailable on this account — the arrow keys and Home/End step around it, and it can
		never end up focused or selected.
	</p>
</div>
