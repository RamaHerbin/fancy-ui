<script lang="ts">
	import { BoxReveal } from "$lib/fancy-ui/box-reveal";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<div class="max-w-md space-y-4 p-4">
			<BoxReveal color="#ff6600">
				<h2 class="text-3xl font-bold">Orange Reveal</h2>
			</BoxReveal>
			<BoxReveal color="#22c55e" delay={0.4}>
				<p class="text-lg">Green reveal with a longer delay.</p>
			</BoxReveal>
			<BoxReveal color="#8b5cf6" delay={0.6}>
				<p class="text-lg">Purple reveal stacked below.</p>
			</BoxReveal>
		</div>
	{/key}
</div>
