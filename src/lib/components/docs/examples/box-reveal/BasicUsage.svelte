<script lang="ts">
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<div class="max-w-md space-y-4 p-4">
			<BoxReveal>
				<h2 class="text-4xl font-bold">Box Reveal</h2>
			</BoxReveal>
			<BoxReveal delay={0.4}>
				<p class="text-muted-foreground text-lg">
					UI library for crafting beautiful landing pages.
				</p>
			</BoxReveal>
			<BoxReveal delay={0.6}>
				<div class="flex gap-2">
					<button class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm">Get Started</button>
					<button class="rounded-lg border px-4 py-2 text-sm">Learn More</button>
				</div>
			</BoxReveal>
		</div>
	{/key}
</div>
