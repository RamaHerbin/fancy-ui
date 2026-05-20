<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<BlurReveal blur="40px" yOffset={40}>
			<h3 class="mb-4 text-2xl font-bold">Bold entrance</h3>
			<p class="text-muted-foreground mb-3">
				40px blur with 40px vertical offset makes the reveal much more pronounced.
			</p>
			<p class="text-muted-foreground">Great for hero sections and landing pages.</p>
		</BlurReveal>
	{/key}
</div>
