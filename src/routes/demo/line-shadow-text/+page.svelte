<script lang="ts">
	import { LineShadowText } from "$lib/fancy-ui/line-shadow-text";
	import { createThemeState } from "$lib/stores/theme.svelte";

	const themeState = createThemeState();
	const shadowColor = $derived(themeState.isDark ? "white" : "black");
</script>

<svelte:head>
	<title>LineShadowText - FancyUI</title>
</svelte:head>

<div class="flex h-56 w-full flex-col items-center justify-center">
	<h1 class="text-8xl leading-none font-extrabold tracking-tighter text-balance">
		Shadow <LineShadowText text="Text" class="italic" {shadowColor} />
	</h1>
</div>

<div class="container mx-auto px-4 py-12">
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex items-center justify-center rounded-lg border p-8">
			<p class="text-6xl leading-none font-bold">
				Shadow <LineShadowText text="Text" class="italic" {shadowColor} />
			</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Shadow Color</h2>
		<div class="bg-card flex flex-col items-center gap-6 rounded-lg border p-8">
			<p class="text-5xl leading-none font-bold">
				Red <LineShadowText text="Shadow" shadowColor="red" />
			</p>
			<p class="text-5xl leading-none font-bold">
				Blue <LineShadowText text="Shadow" shadowColor="royalblue" />
			</p>
			<p class="text-5xl leading-none font-bold">
				Emerald <LineShadowText text="Shadow" shadowColor="oklch(0.765 0.177 163.22)" />
			</p>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">As Heading</h2>
		<div class="bg-card rounded-lg border p-8">
			<h1 class="text-5xl leading-none font-extrabold tracking-tight">
				Page <LineShadowText text="Title" />
			</h1>
		</div>
	</section>

	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Dark Background</h2>
		<div class="flex items-center justify-center rounded-lg border bg-zinc-950 p-8">
			<p class="text-6xl leading-none font-bold text-white">
				Light on <LineShadowText text="Dark" shadowColor="white" />
			</p>
		</div>
	</section>
</div>
