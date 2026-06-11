<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative text-center">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<span class="text-muted-foreground text-4xl font-bold">$</span>
		<NumberTicker value={99.99} decimalPlaces={2} class="text-6xl font-bold" />
	{/key}
</div>
