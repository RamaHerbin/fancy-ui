<script lang="ts">
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<div class="max-w-md p-4">
			<BoxReveal duration={1} delay={0.3}>
				<h2 class="text-3xl font-bold">Slow and dramatic</h2>
			</BoxReveal>
		</div>
	{/key}
</div>
