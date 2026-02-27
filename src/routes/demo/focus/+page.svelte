<script lang="ts">
	import { Focus } from "$lib/fancy-ui/focus";
</script>

<svelte:head>
	<title>Focus - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Focus</h1>
	<p class="text-muted-foreground mb-8">
		A text component that cycles through words, focusing on one at a time with a decorative frame.
		Non-focused words are blurred.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Auto Mode (default)</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<Focus sentence="Build beautiful interfaces easily" />
		</div>
	</section>

	<!-- Custom Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Custom Border Color</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<Focus sentence="Design with confidence" borderColor="cyan" />
		</div>
	</section>

	<!-- Manual Mode -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Manual Mode (hover)</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<Focus sentence="Hover over each word" manualMode borderColor="orange" />
		</div>
	</section>

	<!-- High Blur -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">High Blur Amount</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
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
