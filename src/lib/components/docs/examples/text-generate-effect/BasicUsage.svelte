<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<TextGenerateEffect
			words="Svelte is a radical new approach to building user interfaces. It shifts work from the browser to a compile step that happens when you build your app."
		/>
	{/key}
</div>
