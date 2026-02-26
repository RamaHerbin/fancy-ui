<script lang="ts">
	import { LineShadowText } from '$lib/fancy-ui/line-shadow-text';
</script>

<svelte:head>
	<title>LineShadowText - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">LineShadowText</h1>
	<p class="text-muted-foreground mb-8">
		Text with an animated diagonal line shadow pattern.
	</p>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="border rounded-lg p-8 bg-card flex items-center justify-center">
			<LineShadowText text="Shadow Text" class="text-6xl font-bold" />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Shadow Color</h2>
		<div class="border rounded-lg p-8 bg-card flex flex-col items-center gap-6">
			<LineShadowText text="Red Shadow" shadowColor="red" class="text-5xl font-bold" />
			<LineShadowText text="Blue Shadow" shadowColor="royalblue" class="text-5xl font-bold" />
			<LineShadowText
				text="Emerald Shadow"
				shadowColor="oklch(0.765 0.177 163.22)"
				class="text-5xl font-bold"
			/>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">As Heading</h2>
		<div class="border rounded-lg p-8 bg-card">
			<LineShadowText text="Page Title" as="h1" class="text-5xl font-extrabold tracking-tight" />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Dark Background</h2>
		<div class="border rounded-lg p-8 bg-black flex items-center justify-center">
			<LineShadowText
				text="Light on Dark"
				shadowColor="white"
				class="text-6xl font-bold text-white"
			/>
		</div>
	</section>
</div>
