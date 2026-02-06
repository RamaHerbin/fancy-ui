<script lang="ts">
	import { NumberTicker } from '$lib/fancy-ui/number-ticker';
</script>

<svelte:head>
	<title>NumberTicker - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">NumberTicker</h1>
	<p class="text-muted-foreground mb-8">
		Animated number counter that triggers when scrolled into view. Counts with easing.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center gap-16 rounded-xl p-12">
				<div class="text-center">
					<NumberTicker value={1234} class="text-6xl font-bold" />
					<p class="text-sm text-muted-foreground mt-2">Users</p>
				</div>
				<div class="text-center">
					<NumberTicker value={567} class="text-6xl font-bold" />
					<p class="text-sm text-muted-foreground mt-2">Projects</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Decimal Places -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Decimal Places</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<div class="text-center">
					<span class="text-4xl font-bold text-muted-foreground">$</span>
					<NumberTicker value={99.99} decimalPlaces={2} class="text-6xl font-bold" />
				</div>
			</div>
		</div>
	</section>

	<!-- Count Down -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Count Down</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<NumberTicker value={100} direction="down" class="text-6xl font-bold" />
			</div>
		</div>
	</section>

	<!-- With Delay -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Delay (500ms)</h2>
		<div class="rounded-lg border bg-card p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<NumberTicker value={9999} delay={500} duration={2000} class="text-6xl font-bold" />
			</div>
		</div>
	</section>
</div>
