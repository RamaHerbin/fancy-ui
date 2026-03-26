<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import ReplayButton from "$lib/components/ReplayButton.svelte";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let replayKey1 = $state(0);
	let replayKey2 = $state(0);
	let replayKey3 = $state(0);
	let replayKey4 = $state(0);
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
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey1++} />
			{#key replayKey1}
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
			{/key}
		</div>
	</section>

	<!-- Decimal Places -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Decimal Places</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey2++} />
			{#key replayKey2}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<div class="text-center">
						<span class="text-muted-foreground text-4xl font-bold">$</span>
						<NumberTicker value={99.99} decimalPlaces={2} class="text-6xl font-bold" />
					</div>
				</div>
			{/key}
		</div>
	</section>

	<!-- Count Down -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Count Down</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey3++} />
			{#key replayKey3}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<NumberTicker value={100} direction="down" class="text-6xl font-bold" />
				</div>
			{/key}
		</div>
	</section>

	<!-- With Delay -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Delay (500ms)</h2>
		<div class="bg-card relative rounded-lg border p-6">
			<ReplayButton onclick={() => replayKey4++} />
			{#key replayKey4}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<NumberTicker value={9999} delay={500} duration={2000} class="text-6xl font-bold" />
				</div>
			{/key}
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Interactive Playground</h2>
		<PropsPlayground
			controls={[
				{ key: 'value', type: 'range', label: 'Value', min: 0, max: 100000, step: 100 },
				{ key: 'duration', type: 'range', label: 'Duration (ms)', min: 200, max: 5000, step: 100 },
				{ key: 'delay', type: 'range', label: 'Delay (ms)', min: 0, max: 2000, step: 100 },
				{ key: 'decimalPlaces', type: 'range', label: 'Decimal Places', min: 0, max: 4, step: 1 },
				{ key: 'direction', type: 'select', label: 'Direction', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }] },
			]}
			initialValues={{ value: 1234, duration: 1000, delay: 0, decimalPlaces: 0, direction: 'up' }}
		>
			{#snippet preview(values)}
				<div class="flex items-center justify-center rounded-xl p-12">
					<NumberTicker
						value={values.value as number}
						duration={values.duration as number}
						delay={values.delay as number}
						decimalPlaces={values.decimalPlaces as number}
						direction={values.direction as 'up' | 'down'}
						class="text-6xl font-bold"
					/>
				</div>
			{/snippet}
		</PropsPlayground>
	</section>
</div>
