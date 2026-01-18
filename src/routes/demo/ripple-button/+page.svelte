<script lang="ts">
	import { RippleButton } from '$lib/inspira/ripple-button';
</script>

<svelte:head>
	<title>RippleButton - Inspira Svelte</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<div class="mb-8">
		<a href="/demo" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to components</a>
	</div>

	<h1 class="text-3xl font-bold mb-2">RippleButton</h1>
	<p class="text-muted-foreground mb-8">
		A button with a Material Design-inspired ripple effect on click.
		The ripple originates from the click position and expands outward.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<RippleButton>Click me</RippleButton>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Ripple Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Customize the ripple color with the <code class="rounded bg-muted px-1.5 py-0.5">rippleColor</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4 justify-center">
			<RippleButton rippleColor="#ADD8E6">Light Blue</RippleButton>
			<RippleButton rippleColor="#90EE90">Light Green</RippleButton>
			<RippleButton rippleColor="#FFB6C1">Light Pink</RippleButton>
			<RippleButton rippleColor="#FFD700">Gold</RippleButton>
		</div>
	</section>

	<!-- Animation Duration -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Duration</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control the ripple speed with <code class="rounded bg-muted px-1.5 py-0.5">duration</code> (in milliseconds).
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4 justify-center">
			<RippleButton duration={300}>Fast (300ms)</RippleButton>
			<RippleButton duration={600}>Default (600ms)</RippleButton>
			<RippleButton duration={1000}>Slow (1000ms)</RippleButton>
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Styling</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Override styles with the <code class="rounded bg-muted px-1.5 py-0.5">class</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-4 justify-center">
			<RippleButton class="bg-primary text-primary-foreground border-primary" rippleColor="#ffffff">
				Primary
			</RippleButton>
			<RippleButton class="bg-destructive text-white border-destructive" rippleColor="#ffffff">
				Destructive
			</RippleButton>
			<RippleButton class="rounded-full px-6" rippleColor="#9333ea">
				Rounded
			</RippleButton>
		</div>
	</section>

	<!-- Multiple Clicks -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Multiple Ripples</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Click rapidly to see multiple ripples at once.
		</p>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<RippleButton class="px-12 py-4 text-lg" rippleColor="#8B5CF6" duration={800}>
				Click rapidly!
			</RippleButton>
		</div>
	</section>
</div>
