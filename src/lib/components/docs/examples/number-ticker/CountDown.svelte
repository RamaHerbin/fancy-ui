<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<NumberTicker value={100} direction="down" class="text-6xl font-bold" />
	{/key}
</div>
