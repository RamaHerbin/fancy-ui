<script lang="ts">
	import { GradientButton } from '$lib/fancy-ui/gradient-button';
</script>

<svelte:head>
	<title>GradientButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">GradientButton</h1>
	<p class="text-muted-foreground mb-8">
		A button with a rotating conic-gradient rainbow border and blur effect.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<GradientButton class="text-white font-medium">Click me</GradientButton>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Change the gradient with the <code class="rounded bg-muted px-1.5 py-0.5">colors</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<GradientButton
					colors={['#3b82f6', '#8b5cf6', '#3b82f6']}
					class="text-white font-medium"
				>
					Blue → Purple
				</GradientButton>
				<span class="text-xs text-muted-foreground">Blue / Purple</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton
					colors={['#f43f5e', '#fb923c', '#f43f5e']}
					class="text-white font-medium"
				>
					Rose → Orange
				</GradientButton>
				<span class="text-xs text-muted-foreground">Rose / Orange</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton
					colors={['#10b981', '#06b6d4', '#10b981']}
					class="text-white font-medium"
				>
					Emerald → Cyan
				</GradientButton>
				<span class="text-xs text-muted-foreground">Emerald / Cyan</span>
			</div>
		</div>
	</section>

	<!-- Border Width & Blur -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Border Width &amp; Blur</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust thickness with <code class="rounded bg-muted px-1.5 py-0.5">borderWidth</code> and softness with <code class="rounded bg-muted px-1.5 py-0.5">blur</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={1} blur={2} class="text-white font-medium">
					Thin & Sharp
				</GradientButton>
				<span class="text-xs text-muted-foreground">1px / 2px blur</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={2} blur={4} class="text-white font-medium">
					Default
				</GradientButton>
				<span class="text-xs text-muted-foreground">2px / 4px blur</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={4} blur={8} class="text-white font-medium">
					Thick & Soft
				</GradientButton>
				<span class="text-xs text-muted-foreground">4px / 8px blur</span>
			</div>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control the rotation speed with the <code class="rounded bg-muted px-1.5 py-0.5">duration</code> prop (in ms).
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={1000} class="text-white font-medium">Fast</GradientButton>
				<span class="text-xs text-muted-foreground">1000ms</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={2500} class="text-white font-medium">Default</GradientButton>
				<span class="text-xs text-muted-foreground">2500ms</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={5000} class="text-white font-medium">Slow</GradientButton>
				<span class="text-xs text-muted-foreground">5000ms</span>
			</div>
		</div>
	</section>

	<!-- Border Radius -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Border Radius</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Change the shape with the <code class="rounded bg-muted px-1.5 py-0.5">borderRadius</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={0} class="text-white font-medium">Square</GradientButton>
				<span class="text-xs text-muted-foreground">0px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={8} class="text-white font-medium">Rounded</GradientButton>
				<span class="text-xs text-muted-foreground">8px (default)</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={100} class="text-white font-medium">Pill</GradientButton>
				<span class="text-xs text-muted-foreground">100px</span>
			</div>
		</div>
	</section>

	<!-- Background Color -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Background Color</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Set the content area background with the <code class="rounded bg-muted px-1.5 py-0.5">bgColor</code> prop.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap justify-center gap-4">
			<GradientButton bgColor="#000" class="text-white font-medium">Black (default)</GradientButton>
			<GradientButton bgColor="#1e293b" class="text-white font-medium">Slate</GradientButton>
			<GradientButton bgColor="#18181b" class="text-white font-medium">Zinc</GradientButton>
		</div>
	</section>
</div>
