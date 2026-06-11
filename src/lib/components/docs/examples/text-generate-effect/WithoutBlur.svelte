<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<TextGenerateEffect
			words="This text fades in without the blur effect, using a simple opacity transition."
			filter={false}
		/>
	{/key}
</div>
