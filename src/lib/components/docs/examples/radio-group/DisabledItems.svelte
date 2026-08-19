<script lang="ts">
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";

	let plan = $state("starter");
</script>

<div class="flex flex-col items-start gap-2">
	<RadioGroup bind:value={plan} label="Plan">
		<RadioGroupItem value="starter" label="Starter" />
		<RadioGroupItem value="team" label="Team (unavailable)" disabled />
		<RadioGroupItem value="enterprise" label="Enterprise" />
	</RadioGroup>
	<p class="text-muted-foreground text-sm">
		"Team" is unavailable on this account — it can never end up selected, and the browser's own tab
		order skips it entirely.
	</p>
</div>
