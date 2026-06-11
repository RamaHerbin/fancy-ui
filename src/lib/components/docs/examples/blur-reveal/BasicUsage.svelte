<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<BlurReveal>
			<h3 class="mb-4 text-2xl font-bold">Welcome to the future</h3>
			<p class="text-muted-foreground mb-3">
				This paragraph fades in after the heading, with a slight delay.
			</p>
			<p class="text-muted-foreground">And this one follows with another staggered delay.</p>
		</BlurReveal>
	{/key}
</div>
