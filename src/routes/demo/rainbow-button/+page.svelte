<script lang="ts">
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import Sparkles from "@lucide/svelte/icons/sparkles";
</script>

<svelte:head>
	<title>RainbowButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">RainbowButton</h1>
	<p class="text-muted-foreground mb-8">
		An animated button with a rainbow gradient border that continuously animates around the button.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card rounded-lg border p-6">
			<RainbowButton>Get Started</RainbowButton>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control the animation speed with the <code class="bg-muted rounded px-1.5 py-0.5">speed</code> prop
			(in seconds).
		</p>
		<div class="bg-card flex flex-wrap gap-4 rounded-lg border p-6">
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={1}>Fast (1s)</RainbowButton>
				<span class="text-muted-foreground text-xs">speed=1</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={2}>Default (2s)</RainbowButton>
				<span class="text-muted-foreground text-xs">speed=2</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<RainbowButton speed={4}>Slow (4s)</RainbowButton>
				<span class="text-muted-foreground text-xs">speed=4</span>
			</div>
		</div>
	</section>

	<!-- With Icons -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Icons</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Add icons inside the button using Lucide icons or any other icon library.
		</p>
		<div class="bg-card flex flex-wrap gap-4 rounded-lg border p-6">
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
		<h2 class="mb-4 text-xl font-semibold">Disabled State</h2>
		<div class="bg-card rounded-lg border p-6">
			<RainbowButton disabled>Disabled Button</RainbowButton>
		</div>
	</section>

	<!-- As Link -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">As Link</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use the <code class="bg-muted rounded px-1.5 py-0.5">href</code> prop to render as an anchor element.
		</p>
		<div class="bg-card rounded-lg border p-6">
			<RainbowButton href="/demo">Go to Components</RainbowButton>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Styling</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Override styles with the <code class="bg-muted rounded px-1.5 py-0.5">class</code> prop.
		</p>
		<div class="bg-card flex flex-wrap gap-4 rounded-lg border p-6">
			<RainbowButton class="h-9 px-4 text-sm">Small</RainbowButton>
			<RainbowButton>Default</RainbowButton>
			<RainbowButton class="h-14 px-10 text-lg">Large</RainbowButton>
		</div>
	</section>
</div>
