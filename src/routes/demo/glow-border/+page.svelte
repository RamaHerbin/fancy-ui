<script lang="ts">
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
</script>

<svelte:head>
	<title>GlowBorder - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">GlowBorder</h1>
	<p class="text-muted-foreground mb-8">
		An animated glowing border effect. Place inside an element with
		<code class="bg-muted rounded px-1.5 py-0.5">position: relative</code>.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<div class="bg-background relative flex h-40 w-64 items-center justify-center rounded-xl p-6">
				<p class="text-muted-foreground text-center">Content goes here</p>
				<GlowBorder />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Colors</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Use the <code class="bg-muted rounded px-1.5 py-0.5">color</code> prop with a single color or an
			array.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Cyan</p>
				<GlowBorder color="#00ffff" />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Pink</p>
				<GlowBorder color="#ff00ff" />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Gold</p>
				<GlowBorder color="#ffd700" />
			</div>
		</div>
	</section>

	<!-- Multi-Color Gradient -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Multi-Color Gradient</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Pass an array of colors for a gradient glow effect.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Blue → Purple</p>
				<GlowBorder color={["#3b82f6", "#8b5cf6"]} />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Rainbow</p>
				<GlowBorder color={["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#8b00ff"]} />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Sunset</p>
				<GlowBorder color={["#f97316", "#ec4899", "#8b5cf6"]} />
			</div>
		</div>
	</section>

	<!-- Border Width -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Border Width</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Adjust thickness with <code class="bg-muted rounded px-1.5 py-0.5">borderWidth</code>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">1px</p>
				<GlowBorder borderWidth={1} color="#00ffff" />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">3px</p>
				<GlowBorder borderWidth={3} color="#00ffff" />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">5px</p>
				<GlowBorder borderWidth={5} color="#00ffff" />
			</div>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Animation Speed</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Control speed with <code class="bg-muted rounded px-1.5 py-0.5">duration</code> (in seconds).
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Fast (3s)</p>
				<GlowBorder duration={3} color={["#f97316", "#ec4899"]} />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Default (10s)</p>
				<GlowBorder color={["#f97316", "#ec4899"]} />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-xl p-4">
				<p class="text-muted-foreground text-center text-xs">Slow (20s)</p>
				<GlowBorder duration={20} color={["#f97316", "#ec4899"]} />
			</div>
		</div>
	</section>

	<!-- Border Radius -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Border Radius</h2>
		<p class="text-muted-foreground mb-4 text-sm">
			Match your container's border radius with <code class="bg-muted rounded px-1.5 py-0.5"
				>borderRadius</code
			>.
		</p>
		<div class="bg-card flex flex-wrap justify-center gap-6 rounded-lg border p-6">
			<div
				class="bg-background relative flex h-32 w-48 items-center justify-center rounded-none p-4"
			>
				<p class="text-muted-foreground text-center text-xs">Square (0)</p>
				<GlowBorder borderRadius={0} color="#10b981" />
			</div>
			<div class="bg-background relative flex h-32 w-48 items-center justify-center rounded-lg p-4">
				<p class="text-muted-foreground text-center text-xs">Rounded (8)</p>
				<GlowBorder borderRadius={8} color="#10b981" />
			</div>
			<div
				class="bg-background relative flex h-32 w-32 items-center justify-center rounded-full p-4"
			>
				<p class="text-muted-foreground text-center text-xs">Circle</p>
				<GlowBorder borderRadius={64} color="#10b981" />
			</div>
		</div>
	</section>

	<!-- Card Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Card Example</h2>
		<div class="bg-card flex justify-center rounded-lg border p-6">
			<div class="bg-card relative max-w-sm rounded-2xl border p-6">
				<GlowBorder borderRadius={16} color={["#3b82f6", "#8b5cf6", "#ec4899"]} borderWidth={2} />
				<h3 class="mb-2 text-lg font-semibold">Premium Feature</h3>
				<p class="text-muted-foreground mb-4 text-sm">
					This card has a beautiful animated glow border that draws attention.
				</p>
				<button
					class="bg-primary text-primary-foreground w-full rounded-lg px-4 py-2 text-sm font-medium"
				>
					Get Started
				</button>
			</div>
		</div>
	</section>
</div>
