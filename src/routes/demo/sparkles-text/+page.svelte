<script lang="ts">
	import { SparklesText } from '$lib/fancy-ui/sparkles-text';
</script>

<svelte:head>
	<title>SparklesText - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">SparklesText</h1>
	<p class="text-muted-foreground mb-8">
		Text with animated sparkle star overlay. Stars fade, scale, and rotate continuously.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<SparklesText text="Sparkles" />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<div class="rounded-lg border bg-card p-6 space-y-8">
			<div class="flex items-center justify-center rounded-xl p-8">
				<SparklesText text="Golden" colors={{ first: '#FFD700', second: '#FFA500' }} />
			</div>
			<div class="flex items-center justify-center rounded-xl bg-slate-950 p-8">
				<SparklesText
					text="Neon"
					colors={{ first: '#00FF88', second: '#00BBFF' }}
					class="text-white"
				/>
			</div>
		</div>
	</section>

	<!-- More Sparkles -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Lots of Sparkles (20)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<SparklesText text="Party Time" sparklesCount={20} />
			</div>
		</div>
	</section>
</div>
