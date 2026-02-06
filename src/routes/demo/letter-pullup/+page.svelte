<script lang="ts">
	import { LetterPullup } from '$lib/fancy-ui/letter-pullup';
</script>

<svelte:head>
	<title>LetterPullup - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">LetterPullup</h1>
	<p class="text-muted-foreground mb-8">
		Staggered letter pull-up animation. Each character pulls up from below with a wave effect.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<LetterPullup words="Letter Pullup" />
			</div>
		</div>
	</section>

	<!-- Slow Delay -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Slower Stagger (0.1s)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<LetterPullup words="Slow Wave" delay={0.1} />
			</div>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Styling</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl bg-slate-950 p-12">
				<LetterPullup words="Styled Text" class="text-5xl text-purple-400" />
			</div>
		</div>
	</section>
</div>
