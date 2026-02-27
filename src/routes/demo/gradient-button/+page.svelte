<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
</script>

<svelte:head>
	<title>GradientButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">GradientButton</h1>
	<p class="text-muted-foreground mb-8">
		A button with a rotating conic-gradient rainbow border and blur effect.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<GradientButton class="font-medium text-white">Click me</GradientButton>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Change the gradient with the <code class="bg-muted rounded px-1.5 py-0.5">colors</code> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<div class="flex flex-col items-center gap-2">
				<GradientButton colors={["#3b82f6", "#8b5cf6", "#3b82f6"]} class="font-medium text-white">
					Blue → Purple
				</GradientButton>
				<span class="text-muted-foreground text-xs">Blue / Purple</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton colors={["#f43f5e", "#fb923c", "#f43f5e"]} class="font-medium text-white">
					Rose → Orange
				</GradientButton>
				<span class="text-muted-foreground text-xs">Rose / Orange</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton colors={["#10b981", "#06b6d4", "#10b981"]} class="font-medium text-white">
					Emerald → Cyan
				</GradientButton>
				<span class="text-muted-foreground text-xs">Emerald / Cyan</span>
			</div>
		</div>
	</section>

	<!-- Border Width & Blur -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Border Width &amp; Blur</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Adjust thickness with <code class="bg-muted rounded px-1.5 py-0.5">borderWidth</code> and
			softness with <code class="bg-muted rounded px-1.5 py-0.5">blur</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={1} blur={2} class="font-medium text-white">
					Thin & Sharp
				</GradientButton>
				<span class="text-muted-foreground text-xs">1px / 2px blur</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={2} blur={4} class="font-medium text-white">
					Default
				</GradientButton>
				<span class="text-muted-foreground text-xs">2px / 4px blur</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderWidth={4} blur={8} class="font-medium text-white">
					Thick & Soft
				</GradientButton>
				<span class="text-muted-foreground text-xs">4px / 8px blur</span>
			</div>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control the rotation speed with the <code class="bg-muted rounded px-1.5 py-0.5"
				>duration</code
			> prop (in ms).
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={1000} class="font-medium text-white">Fast</GradientButton>
				<span class="text-muted-foreground text-xs">1000ms</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={2500} class="font-medium text-white">Default</GradientButton>
				<span class="text-muted-foreground text-xs">2500ms</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton duration={5000} class="font-medium text-white">Slow</GradientButton>
				<span class="text-muted-foreground text-xs">5000ms</span>
			</div>
		</div>
	</section>

	<!-- Border Radius -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Border Radius</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Change the shape with the <code class="bg-muted rounded px-1.5 py-0.5">borderRadius</code> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={0} class="font-medium text-white">Square</GradientButton>
				<span class="text-muted-foreground text-xs">0px</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={8} class="font-medium text-white">Rounded</GradientButton>
				<span class="text-muted-foreground text-xs">8px (default)</span>
			</div>
			<div class="flex flex-col items-center gap-2">
				<GradientButton borderRadius={100} class="font-medium text-white">Pill</GradientButton>
				<span class="text-muted-foreground text-xs">100px</span>
			</div>
		</div>
	</section>

	<!-- Background Color -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Background Color</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Set the content area background with the <code class="bg-muted rounded px-1.5 py-0.5"
				>bgColor</code
			> prop.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-4 rounded-lg border p-6">
			<GradientButton bgColor="#000" class="font-medium text-white">Black (default)</GradientButton>
			<GradientButton bgColor="#1e293b" class="font-medium text-white">Slate</GradientButton>
			<GradientButton bgColor="#18181b" class="font-medium text-white">Zinc</GradientButton>
		</div>
	</section>
</div>
