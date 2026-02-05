<script lang="ts">
	import { RainbowButton } from '$lib/fancy-ui/rainbow-button';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';
</script>

<svelte:head>
	<title>RainbowButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">RainbowButton</h1>
	<p class="text-muted-foreground mb-8">
		An animated button with a rainbow gradient border that continuously animates around the button.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6">
			<RainbowButton>Get Started</RainbowButton>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control the animation speed with the <code class="rounded bg-muted px-1.5 py-0.5">speed</code> prop (in seconds).
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4">
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={1}>Fast (1s)</RainbowButton>
				<span class="text-xs text-muted-foreground">speed=1</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={2}>Default (2s)</RainbowButton>
				<span class="text-xs text-muted-foreground">speed=2</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={4}>Slow (4s)</RainbowButton>
				<span class="text-xs text-muted-foreground">speed=4</span>
			</div>
		</div>
	</section>

	<!-- With Icons -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Icons</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Add icons inside the button using Lucide icons or any other icon library.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4">
			<RainbowButton>
				<Sparkles class="mr-2 h-4 w-4" />
				Magic Button
			</RainbowButton>
			<RainbowButton>
				Continue
				<ChevronRight class="ml-2 h-4 w-4" />
			</RainbowButton>
		</div>
	</section>

	<!-- Disabled State -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Disabled State</h2>
		<div class="rounded-lg border bg-card p-6">
			<RainbowButton disabled>Disabled Button</RainbowButton>
		</div>
	</section>

	<!-- As Link -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">As Link</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Use the <code class="rounded bg-muted px-1.5 py-0.5">href</code> prop to render as an anchor element.
		</p>
		<div class="rounded-lg border bg-card p-6">
			<RainbowButton href="/demo">Go to Components</RainbowButton>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Styling</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Override styles with the <code class="rounded bg-muted px-1.5 py-0.5">class</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4">
			<RainbowButton class="h-9 px-4 text-sm">Small</RainbowButton>
			<RainbowButton>Default</RainbowButton>
			<RainbowButton class="h-14 px-10 text-lg">Large</RainbowButton>
		</div>
	</section>
</div>
