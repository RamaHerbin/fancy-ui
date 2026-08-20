<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<BlurReveal mode="hard">
			<h3 class="mb-4 text-2xl font-bold">Snaps into place</h3>
			<p class="text-muted-foreground mb-3">
				No blur, no translate softening — opacity jumps in via a stepped timing function.
			</p>
			<p class="text-muted-foreground">Suited to hard-edge art directions.</p>
		</BlurReveal>
	{/key}
</div>
