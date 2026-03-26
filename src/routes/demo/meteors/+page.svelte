<script lang="ts">
	import { Meteors } from "$lib/fancy-ui/meteors";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<svelte:head>
	<title>Meteors - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Meteors</h1>
	<p class="text-muted-foreground mb-8">
		Animated meteor shower effect with randomized positions, delays, and durations.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div
				class="bg-background relative mx-auto flex h-64 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border p-6"
			>
				<p class="text-foreground z-10 text-center">Default (20 meteors)</p>
				<Meteors />
			</div>
		</div>
	</section>

	<!-- Custom Count -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Count</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control the number of meteors with the <code class="bg-muted rounded px-1.5 py-0.5"
				>count</code
			> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div
				class="bg-background relative flex h-48 w-56 items-center justify-center overflow-hidden rounded-xl border p-4"
			>
				<p class="text-foreground z-10 text-center text-xs">5 meteors</p>
				<Meteors count={5} />
			</div>
			<div
				class="bg-background relative flex h-48 w-56 items-center justify-center overflow-hidden rounded-xl border p-4"
			>
				<p class="text-foreground z-10 text-center text-xs">40 meteors</p>
				<Meteors count={40} />
			</div>
		</div>
	</section>

	<!-- Card Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Card with Meteors</h2>
		<div class="bg-card rounded-lg border p-6">
			<div
				class="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
			>
				<Meteors count={15} />
				<div class="relative z-10">
					<h3 class="mb-2 text-lg font-bold text-white">Shooting Stars</h3>
					<p class="text-sm text-zinc-400">
						A beautiful meteor shower effect for dark-themed cards and hero sections.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Playground -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[{ key: "count", type: "range", label: "Count", min: 1, max: 80, step: 1 }]}
			initialValues={{ count: 20 }}
		>
			{#snippet preview(values)}
				<div
					class="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
				>
					<Meteors count={values.count as number} />
					<div class="relative z-10">
						<h3 class="mb-2 text-lg font-bold text-white">Shooting Stars</h3>
						<p class="text-sm text-zinc-400">
							A beautiful meteor shower effect for dark-themed cards and hero sections.
						</p>
					</div>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
