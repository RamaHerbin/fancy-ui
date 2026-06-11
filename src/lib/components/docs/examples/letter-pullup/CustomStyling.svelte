<script lang="ts">
	import { LetterPullup } from "$lib/fancy-ui/letter-pullup";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey = $state(0);
</script>

<div class="relative rounded-xl bg-slate-950 p-12">
	<ReplayButton onclick={() => replayKey++} />
	{#key replayKey}
		<LetterPullup words="Styled Text" class="text-5xl text-purple-400" />
	{/key}
</div>
