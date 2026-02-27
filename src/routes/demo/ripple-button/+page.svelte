<script lang="ts">
	import { RippleButton } from "$lib/fancy-ui/ripple-button";
</script>

<svelte:head>
	<title>RippleButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">RippleButton</h1>
	<p class="text-muted-foreground mb-8">
		A button with a Material Design-inspired ripple effect on click. The ripple originates from the
		click position and expands outward.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<RippleButton>Click me</RippleButton>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Ripple Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Customize the ripple color with the <code class="bg-muted rounded px-1.5 py-0.5"
				>rippleColor</code
			> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<RippleButton rippleColor="#ADD8E6">Light Blue</RippleButton>
			<RippleButton rippleColor="#90EE90">Light Green</RippleButton>
			<RippleButton rippleColor="#FFB6C1">Light Pink</RippleButton>
			<RippleButton rippleColor="#FFD700">Gold</RippleButton>
		</div>
	</section>

	<!-- Animation Duration -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Duration</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control the ripple speed with <code class="bg-muted rounded px-1.5 py-0.5">duration</code> (in milliseconds).
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<RippleButton duration={300}>Fast (300ms)</RippleButton>
			<RippleButton duration={600}>Default (600ms)</RippleButton>
			<RippleButton duration={1000}>Slow (1000ms)</RippleButton>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Styling</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Override styles with the <code class="bg-muted rounded px-1.5 py-0.5">class</code> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<RippleButton class="bg-primary text-primary-foreground border-primary" rippleColor="#ffffff">
				Primary
			</RippleButton>
			<RippleButton class="bg-destructive border-destructive text-white" rippleColor="#ffffff">
				Destructive
			</RippleButton>
			<RippleButton class="rounded-full px-6" rippleColor="#9333ea">Rounded</RippleButton>
		</div>
	</section>

	<!-- Multiple Clicks -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Multiple Ripples</h2>
		<p class="text-muted-foreground mb-4 text-sm">Click rapidly to see multiple ripples at once.</p>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<RippleButton class="px-12 py-4 text-lg" rippleColor="#8B5CF6" duration={800}>
				Click rapidly!
			</RippleButton>
		</div>
	</section>
</div>
