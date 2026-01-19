<script lang="ts">
	import { GlowBorder } from '$lib/fancy-ui/glow-border';
</script>

<svelte:head>
	<title>GlowBorder - FancyUI</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-12 px-4">
	<div class="mb-8">
		<a href="/demo" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to components</a>
	</div>

	<h1 class="text-3xl font-bold mb-2">GlowBorder</h1>
	<p class="text-muted-foreground mb-8">
		An animated glowing border effect. Place inside an element with
		<code class="rounded bg-muted px-1.5 py-0.5">position: relative</code>.
	</p>

	<!-- Basic Usage -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<div class="relative h-40 w-64 rounded-xl bg-background p-6 flex items-center justify-center">
				<p class="text-muted-foreground text-center">Content goes here</p>
				<GlowBorder />
			</div>
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Colors</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Use the <code class="rounded bg-muted px-1.5 py-0.5">color</code> prop with a single color or an array.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Cyan</p>
				<GlowBorder color="#00ffff" />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Pink</p>
				<GlowBorder color="#ff00ff" />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Gold</p>
				<GlowBorder color="#ffd700" />
			</div>
		</div>
	</section>

	<!-- Multi-Color Gradient -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Multi-Color Gradient</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Pass an array of colors for a gradient glow effect.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Blue → Purple</p>
				<GlowBorder color={['#3b82f6', '#8b5cf6']} />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Rainbow</p>
				<GlowBorder color={['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']} />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Sunset</p>
				<GlowBorder color={['#f97316', '#ec4899', '#8b5cf6']} />
			</div>
		</div>
	</section>

	<!-- Border Width -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Border Width</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Adjust thickness with <code class="rounded bg-muted px-1.5 py-0.5">borderWidth</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">1px</p>
				<GlowBorder borderWidth={1} color="#00ffff" />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">3px</p>
				<GlowBorder borderWidth={3} color="#00ffff" />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">5px</p>
				<GlowBorder borderWidth={5} color="#00ffff" />
			</div>
		</div>
	</section>

	<!-- Animation Speed -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Animation Speed</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Control speed with <code class="rounded bg-muted px-1.5 py-0.5">duration</code> (in seconds).
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Fast (3s)</p>
				<GlowBorder duration={3} color={['#f97316', '#ec4899']} />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Default (10s)</p>
				<GlowBorder color={['#f97316', '#ec4899']} />
			</div>
			<div class="relative h-32 w-48 rounded-xl bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Slow (20s)</p>
				<GlowBorder duration={20} color={['#f97316', '#ec4899']} />
			</div>
		</div>
	</section>

	<!-- Border Radius -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Border Radius</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Match your container's border radius with <code class="rounded bg-muted px-1.5 py-0.5">borderRadius</code>.
		</p>
		<div class="rounded-lg border bg-card p-6 flex flex-wrap gap-6 justify-center">
			<div class="relative h-32 w-48 rounded-none bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Square (0)</p>
				<GlowBorder borderRadius={0} color="#10b981" />
			</div>
			<div class="relative h-32 w-48 rounded-lg bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Rounded (8)</p>
				<GlowBorder borderRadius={8} color="#10b981" />
			</div>
			<div class="relative h-32 w-32 rounded-full bg-background p-4 flex items-center justify-center">
				<p class="text-xs text-muted-foreground text-center">Circle</p>
				<GlowBorder borderRadius={64} color="#10b981" />
			</div>
		</div>
	</section>

	<!-- Card Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Card Example</h2>
		<div class="rounded-lg border bg-card p-6 flex justify-center">
			<div class="relative rounded-2xl bg-card border p-6 max-w-sm">
				<GlowBorder borderRadius={16} color={['#3b82f6', '#8b5cf6', '#ec4899']} borderWidth={2} />
				<h3 class="text-lg font-semibold mb-2">Premium Feature</h3>
				<p class="text-sm text-muted-foreground mb-4">
					This card has a beautiful animated glow border that draws attention.
				</p>
				<button class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
					Get Started
				</button>
			</div>
		</div>
	</section>
</div>
