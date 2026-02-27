<script lang="ts">
	import { GlowingEffect } from "$lib/fancy-ui/glowing-effect";
</script>

<svelte:head>
	<title>GlowingEffect - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">GlowingEffect</h1>
	<p class="text-muted-foreground mb-8">
		Mouse-proximity based glowing border effect with animated conic gradient.
	</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Default Variant</h2>
		<div class="bg-card relative max-w-md rounded-xl border p-8">
			<GlowingEffect spread={40} glow disabled={false} />
			<h3 class="mb-2 text-lg font-semibold">Hover near me</h3>
			<p class="text-muted-foreground">Move your cursor near this card to see the glow effect.</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">White Variant</h2>
		<div class="bg-card relative max-w-md rounded-xl border p-8">
			<GlowingEffect spread={40} glow variant="white" disabled={false} />
			<h3 class="mb-2 text-lg font-semibold">White glow</h3>
			<p class="text-muted-foreground">A subtle white border glow variant.</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">With Blur</h2>
		<div class="bg-card relative max-w-md rounded-xl border p-8">
			<GlowingEffect spread={60} glow blur={6} proximity={100} disabled={false} />
			<h3 class="mb-2 text-lg font-semibold">Blurred glow</h3>
			<p class="text-muted-foreground">Wider spread and blur for a softer effect.</p>
		</div>
	</section>
</div>
