<script lang="ts">
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";

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
					aria-hidden="true"
					focusable="false"
				>
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Replay
			</button>
			{#key replayKey4}
				<div class="mx-auto flex items-center justify-center rounded-xl p-12">
					<NumberTicker value={9999} delay={500} duration={2000} class="text-6xl font-bold" />
				</div>
			{/key}
		</div>
	</section>
</div>
