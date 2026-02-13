<script lang="ts">
	import { ContainerScroll } from '$lib/fancy-ui/container-scroll';
</script>

<svelte:head>
	<title>ContainerScroll - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">ContainerScroll</h1>
	<p class="text-muted-foreground mb-8">
		A scroll-driven animation that rotates and scales a card from a tilted perspective to flat.
		Scroll down to see the effect.
	</p>

	<ContainerScroll>
		{#snippet titleContent()}
			<h2 class="text-4xl font-semibold text-foreground dark:text-white">
				Unleash the power of <br />
				<span class="mt-1 text-4xl font-bold leading-none md:text-[6rem]">Scroll Animations</span>
			</h2>
		{/snippet}
		{#snippet cardContent()}
			<div
				class="flex size-full flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 p-8 text-white"
			>
				<h3 class="text-3xl font-bold">Your Content Here</h3>
				<p class="mt-4 max-w-md text-center text-lg text-white/80">
					This card rotates from 20 degrees to 0 as you scroll. It also scales smoothly
					to create a dramatic reveal effect.
				</p>
			</div>
		{/snippet}
	</ContainerScroll>
</div>
