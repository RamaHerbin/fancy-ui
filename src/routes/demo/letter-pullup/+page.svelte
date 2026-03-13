<script lang="ts">
	import { LetterPullup } from "$lib/fancy-ui/letter-pullup";

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
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
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
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
			{#key replayKey3}
				<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
					<LetterPullup words="Styled Text" class="text-5xl text-purple-400" />
				</div>
			{/key}
		</div>
	</section>
</div>
