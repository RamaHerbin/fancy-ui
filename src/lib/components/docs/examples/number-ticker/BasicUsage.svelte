<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<div class="flex items-center gap-16">
			<div class="text-center">
				<NumberTicker value={1234} class="text-6xl font-bold" />
				<p class="text-muted-foreground mt-2 text-sm">Users</p>
			</div>
			<div class="text-center">
				<NumberTicker value={567} class="text-6xl font-bold" />
				<p class="text-muted-foreground mt-2 text-sm">Projects</p>
			</div>
		</div>
	{/key}
</div>
