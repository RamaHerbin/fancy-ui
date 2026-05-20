<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<TextGenerateEffect
			words="Quick reveal with a short duration and tight stagger between words."
			duration={0.3}
			stagger={80}
		/>
	{/key}
</div>
