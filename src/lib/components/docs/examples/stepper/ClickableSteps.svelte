<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(0);
	let lastClicked = $state<number | null>(null);

	function onStepClick(index: number) {
		lastClicked = index;
	}
</script>

<div class="flex flex-col items-start gap-2">
	<Stepper bind:current clickable {onStepClick}>
		<Step label="Account" />
		<Step label="Profile" />
		<Step label="Confirmation" />
	</Stepper>
	{#if lastClicked !== null}
		<p class="text-muted-foreground text-sm">Jumped to step {lastClicked + 1}.</p>
	{/if}
</div>
