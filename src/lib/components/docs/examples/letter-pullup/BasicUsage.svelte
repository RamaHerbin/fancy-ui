<script lang="ts">
	import { LetterPullup } from "$lib/fancy-ui/letter-pullup";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<LetterPullup words="Letter Pullup" />
	{/key}
</div>
