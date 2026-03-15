<script lang="ts">
	import { LetterPullup } from "$lib/fancy-ui/letter-pullup";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey1 = $state(0);
	let replayKey2 = $state(0);
	let replayKey3 = $state(0);
</script>

<svelte:head>
	<title>LetterPullup - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">LetterPullup</h1>
	<p class="text-muted-foreground mb-8">
		Staggered letter pull-up animation. Each character pulls up from below with a wave effect.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey1++} />
			{#key replayKey1}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<LetterPullup words="Letter Pullup" />
				</div>
			{/key}
		</div>
	</section>

	<!-- Slow Delay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Slower Stagger (0.1s)</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey2++} />
			{#key replayKey2}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<LetterPullup words="Slow Wave" delay={0.1} />
				</div>
			{/key}
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Styling</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey3++} />
			{#key replayKey3}
				<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
					<LetterPullup words="Styled Text" class="text-5xl text-purple-400" />
				</div>
			{/key}
		</div>
	</section>
</div>
