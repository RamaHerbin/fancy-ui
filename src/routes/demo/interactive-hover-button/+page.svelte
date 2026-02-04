<script lang="ts">
	import { InteractiveHoverButton } from '$lib/fancy-ui/interactive-hover-button';
</script>

<svelte:head>
	<title>InteractiveHoverButton - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">InteractiveHoverButton</h1>
	<p class="text-muted-foreground mb-8">
		Button with hover animation: text slides out while an arrow slides in, and a dot scales up to
		fill the background.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Basic Usage</h2>
		<div class="border rounded-lg p-6 bg-card flex items-center justify-center">
			<InteractiveHoverButton />
		</div>
	</section>

	<!-- Custom Text -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Text</h2>
		<div class="border rounded-lg p-6 bg-card flex items-center justify-center gap-4">
			<InteractiveHoverButton text="Get Started" />
			<InteractiveHoverButton text="Learn More" />
			<InteractiveHoverButton text="Subscribe" />
		</div>
	</section>

	<!-- Custom Styling -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Styling</h2>
		<div class="border rounded-lg p-6 bg-card flex items-center justify-center gap-4">
			<InteractiveHoverButton
				text="Danger"
				class="border-red-500/30 [&_div>.size-2]:bg-red-500 [&>div:last-child]:text-white"
			/>
			<InteractiveHoverButton
				text="Success"
				class="border-green-500/30 [&_div>.size-2]:bg-green-500 [&>div:last-child]:text-white"
			/>
		</div>
	</section>
</div>
