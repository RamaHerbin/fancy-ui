<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";
	import ReplayButton from "$lib/components/ReplayButton.svelte";

	let replayKey1 = $state(0);
	let replayKey2 = $state(0);
	let replayKey3 = $state(0);
	let replayKey4 = $state(0);
	let replayKey5 = $state(0);
</script>

<svelte:head>
	<title>TextGenerateEffect - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">TextGenerateEffect</h1>
	<p class="text-muted-foreground mb-8">
		Typewriter-style text reveal that fades in words one by one with an optional blur effect.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card relative rounded-lg border p-8">
			<ReplayButton onclick={() => replayKey1++} />
			{#key replayKey1}
				<TextGenerateEffect
					words="Svelte is a radical new approach to building user interfaces. It shifts work from the browser to a compile step that happens when you build your app."
				/>
			{/key}
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Without Blur</h2>
		<div class="bg-card relative rounded-lg border p-8">
			<ReplayButton onclick={() => replayKey2++} />
			{#key replayKey2}
				<TextGenerateEffect
					words="This text fades in without the blur effect, using a simple opacity transition."
					filter={false}
				/>
			{/key}
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Fast Reveal</h2>
		<div class="bg-card relative rounded-lg border p-8">
			<ReplayButton onclick={() => replayKey3++} />
			{#key replayKey3}
				<TextGenerateEffect
					words="Quick reveal with a short duration and tight stagger between words."
					duration={0.3}
					stagger={80}
				/>
			{/key}
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Slow & Dramatic</h2>
		<div class="bg-card relative rounded-lg border p-8">
			<ReplayButton onclick={() => replayKey4++} />
			{#key replayKey4}
				<TextGenerateEffect
					words="Each word appears slowly with a long pause between them for dramatic effect."
					duration={1.5}
					stagger={500}
					class="text-2xl font-semibold"
				/>
			{/key}
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Delayed Start</h2>
		<div class="bg-card relative rounded-lg border p-8">
			<ReplayButton onclick={() => replayKey5++} />
			{#key replayKey5}
				<TextGenerateEffect
					words="This text waits one second before starting to reveal."
					delay={1000}
				/>
			{/key}
		</div>
	</section>
</div>
