<script lang="ts">
	import { BlurReveal } from "$lib/fancy-ui/blur-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<BlurReveal delay={0.15} class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="bg-background rounded-lg border p-6">
				<h4 class="mb-2 font-semibold">Design</h4>
				<p class="text-muted-foreground text-sm">Beautiful interfaces built with care.</p>
			</div>
			<div class="bg-background rounded-lg border p-6">
				<h4 class="mb-2 font-semibold">Develop</h4>
				<p class="text-muted-foreground text-sm">Clean code that scales with your needs.</p>
			</div>
			<div class="bg-background rounded-lg border p-6">
				<h4 class="mb-2 font-semibold">Deploy</h4>
				<p class="text-muted-foreground text-sm">Ship fast with confidence and reliability.</p>
			</div>
		</BlurReveal>
	{/key}
</div>
