<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
</script>

<svelte:head>
	<title>NumberTicker - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">NumberTicker</h1>
	<p class="text-muted-foreground mb-8">
		Animated number counter that triggers when scrolled into view. Counts with easing.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center gap-16 rounded-xl p-12">
				<div class="text-center">
					<NumberTicker value={1234} class="text-6xl font-bold" />
					<p class="text-muted-foreground mt-2 text-sm">Users</p>
				</div>
				<div class="text-center">
					<NumberTicker value={567} class="text-6xl font-bold" />
					<p class="text-muted-foreground mt-2 text-sm">Projects</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Decimal Places -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Decimal Places</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<div class="text-center">
					<span class="text-muted-foreground text-4xl font-bold">$</span>
					<NumberTicker value={99.99} decimalPlaces={2} class="text-6xl font-bold" />
				</div>
			</div>
		</div>
	</section>

	<!-- Count Down -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Count Down</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<NumberTicker value={100} direction="down" class="text-6xl font-bold" />
			</div>
		</div>
	</section>

	<!-- With Delay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Delay (500ms)</h2>
		<div class="bg-card rounded-lg border p-6">
			<div class="mx-auto flex items-center justify-center rounded-xl p-12">
				<NumberTicker value={9999} delay={500} duration={2000} class="text-6xl font-bold" />
			</div>
		</div>
	</section>
</div>
