<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<TextGenerateEffect
			words="Each word appears slowly with a long pause between them for dramatic effect."
			duration={1.5}
			stagger={500}
			class="text-2xl font-semibold"
		/>
	{/key}
</div>
