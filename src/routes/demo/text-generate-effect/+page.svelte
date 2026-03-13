<script lang="ts">
	import { TextGenerateEffect } from "$lib/fancy-ui/text-generate-effect";

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
			<button
				onclick={() => replayKey1++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey2++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey3++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey4++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
			<button
				onclick={() => replayKey5++}
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
				aria-label="Replay animation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
			{#key replayKey5}
				<TextGenerateEffect
					words="This text waits one second before starting to reveal."
					delay={1000}
				/>
			{/key}
		</div>
	</section>
</div>
