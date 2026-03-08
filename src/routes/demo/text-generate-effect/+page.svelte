<script lang="ts">
	import { TextGenerateEffect } from '$lib/fancy-ui/text-generate-effect';
</script>

<svelte:head>
	<title>TextGenerateEffect - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">TextGenerateEffect</h1>
	<p class="text-muted-foreground mb-8">
		Typewriter-style text reveal that fades in words one by one with an optional blur effect.
	</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="border rounded-lg p-8 bg-card">
			<TextGenerateEffect
				words="Svelte is a radical new approach to building user interfaces. It shifts work from the browser to a compile step that happens when you build your app."
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Without Blur</h2>
		<div class="border rounded-lg p-8 bg-card">
			<TextGenerateEffect
				words="This text fades in without the blur effect, using a simple opacity transition."
				filter={false}
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Fast Reveal</h2>
		<div class="border rounded-lg p-8 bg-card">
			<TextGenerateEffect
				words="Quick reveal with a short duration and tight stagger between words."
				duration={0.3}
				stagger={80}
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Slow & Dramatic</h2>
		<div class="border rounded-lg p-8 bg-card">
			<TextGenerateEffect
				words="Each word appears slowly with a long pause between them for dramatic effect."
				duration={1.5}
				stagger={500}
				class="text-2xl font-semibold"
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Delayed Start</h2>
		<div class="border rounded-lg p-8 bg-card">
			<TextGenerateEffect
				words="This text waits one second before starting to reveal."
				delay={1000}
			/>
		</div>
	</section>
</div>
