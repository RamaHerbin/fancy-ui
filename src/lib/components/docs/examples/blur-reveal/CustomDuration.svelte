<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<BlurReveal duration={1.5} delay={0.4}>
			<h3 class="mb-4 text-2xl font-bold">Slow reveal</h3>
			<p class="text-muted-foreground mb-3">
				Duration is 1.5s with 0.4s stagger between elements.
			</p>
			<p class="text-muted-foreground">The effect is more dramatic with longer timings.</p>
		</BlurReveal>
	{/key}
</div>
