<script lang="ts">
	import { LineReveal } from "$lib/fancy-ui/line-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative w-full">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<LineReveal
			text="A slower, more dramatic reveal: each line waits a quarter second for the previous one."
			font="400 26px Georgia, serif"
			stagger={0.25}
			duration={1.2}
		/>
	{/key}
</div>
