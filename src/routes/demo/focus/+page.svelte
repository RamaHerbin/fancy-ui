<script lang="ts">
	import { Focus } from '$lib/fancy-ui/focus';
</script>

<svelte:head>
	<title>Focus - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Focus</h1>
	<p class="text-muted-foreground mb-8">
		A text component that cycles through words, focusing on one at a time with a decorative
		frame. Non-focused words are blurred.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Auto Mode (default)</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<Focus sentence="Build beautiful interfaces easily" />
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Custom Border Color</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<Focus sentence="Design with confidence" borderColor="cyan" />
		</div>
	</section>

	<!-- Manual Mode -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">Manual Mode (hover)</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<Focus sentence="Hover over each word" manualMode borderColor="orange" />
		</div>
	</section>

	<!-- High Blur -->
	<section class="mb-12">
		<h2 class="text-xl font-semibold mb-4">High Blur Amount</h2>
		<div class="flex justify-center border rounded-lg p-10 bg-card">
			<Focus
				sentence="Strong blur effect here"
				blurAmount={10}
				borderColor="red"
				animationDuration={0.3}
				pauseBetweenAnimations={0.5}
			/>
		</div>
	</section>
</div>
