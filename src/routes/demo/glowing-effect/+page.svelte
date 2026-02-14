<script lang="ts">
	import { GlowingEffect } from '$lib/fancy-ui/glowing-effect';
</script>

<svelte:head>
	<title>GlowingEffect - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">GlowingEffect</h1>
	<p class="text-muted-foreground mb-8">Mouse-proximity based glowing border effect with animated conic gradient.</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Default Variant</h2>
		<div class="relative rounded-xl border bg-card p-8 max-w-md">
			<GlowingEffect spread={40} glow disabled={false} />
			<h3 class="text-lg font-semibold mb-2">Hover near me</h3>
			<p class="text-muted-foreground">Move your cursor near this card to see the glow effect.</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">White Variant</h2>
		<div class="relative rounded-xl border bg-card p-8 max-w-md">
			<GlowingEffect spread={40} glow variant="white" disabled={false} />
			<h3 class="text-lg font-semibold mb-2">White glow</h3>
			<p class="text-muted-foreground">A subtle white border glow variant.</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">With Blur</h2>
		<div class="relative rounded-xl border bg-card p-8 max-w-md">
			<GlowingEffect spread={60} glow blur={6} proximity={100} disabled={false} />
			<h3 class="text-lg font-semibold mb-2">Blurred glow</h3>
			<p class="text-muted-foreground">Wider spread and blur for a softer effect.</p>
		</div>
	</section>
</div>
