<script lang="ts">
	import { Meteors } from '$lib/fancy-ui/meteors';
</script>

<svelte:head>
	<title>Meteors - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Meteors</h1>
	<p class="text-muted-foreground mb-8">
		Animated meteor shower effect with randomized positions, delays, and durations.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="relative mx-auto h-64 w-full max-w-md overflow-hidden rounded-xl border bg-slate-950 p-6 flex items-center justify-center">
				<p class="text-center text-white z-10">Default (20 meteors)</p>
				<Meteors />
			</div>
		</div>
	</section>

	<!-- Custom Count -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Count</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control the number of meteors with the <code class="rounded bg-muted px-1.5 py-0.5">count</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-48 w-56 overflow-hidden rounded-xl border bg-slate-950 p-4 flex items-center justify-center">
				<p class="text-xs text-white text-center z-10">5 meteors</p>
				<Meteors count={5} />
			</div>
			<div class="relative h-48 w-56 overflow-hidden rounded-xl border bg-slate-950 p-4 flex items-center justify-center">
				<p class="text-xs text-white text-center z-10">40 meteors</p>
				<Meteors count={40} />
			</div>
		</div>
	</section>

	<!-- Card Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Card with Meteors</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-xl">
				<Meteors count={15} />
				<div class="relative z-10">
					<h3 class="text-lg font-bold text-white mb-2">Shooting Stars</h3>
					<p class="text-sm text-slate-400">
						A beautiful meteor shower effect for dark-themed cards and hero sections.
					</p>
				</div>
			</div>
		</div>
	</section>
</div>
