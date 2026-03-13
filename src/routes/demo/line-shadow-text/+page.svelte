<script lang="ts">
	import { LineShadowText } from "$lib/fancy-ui/line-shadow-text";
</script>

<svelte:head>
	<title>LineShadowText - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">LineShadowText</h1>
	<p class="text-muted-foreground mb-8">Text with an animated diagonal line shadow pattern.</p>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex items-center justify-center rounded-lg border p-8">
			<LineShadowText text="Shadow Text" class="text-6xl font-bold" />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Shadow Color</h2>
		<div class="bg-card flex flex-col items-center gap-6 rounded-lg border p-8">
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
		<h2 class="mb-4 text-xl font-semibold">As Heading</h2>
		<div class="bg-card rounded-lg border p-8">
			<LineShadowText text="Page Title" as="h1" class="text-5xl font-extrabold tracking-tight" />
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Dark Background</h2>
		<div class="bg-background flex items-center justify-center rounded-lg border p-8">
			<LineShadowText
				text="Light on Dark"
				shadowColor="white"
				class="text-foreground text-6xl font-bold"
			/>
		</div>
	</section>
</div>
