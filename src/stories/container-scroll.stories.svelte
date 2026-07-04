<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ContainerScroll } from "$lib/fancy-ui/container-scroll";

	// ContainerScroll is driven by window scroll, so the story is rendered at its
	// natural (tall) height and the Storybook canvas iframe is scrolled to reveal
	// the rotate/scale animation. Wrapping it in an inner overflow container would
	// prevent the window scroll listener from firing.
	const { Story } = defineMeta({
		title: "Layout/ContainerScroll",
		component: ContainerScroll,
		tags: ["autodocs"],
	});
</script>

{#snippet template()}
	<ContainerScroll>
		{#snippet titleContent()}
			<h2 class="text-foreground text-4xl font-semibold dark:text-white">
				Unleash the power of <br />
				<span class="mt-1 text-4xl leading-none font-bold md:text-[6rem]">Scroll Animations</span>
			</h2>
		{/snippet}
		{#snippet cardContent()}
			<div
				class="flex size-full flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-700 p-8 text-white"
			>
				<h3 class="text-3xl font-bold">Your Content Here</h3>
				<p class="mt-4 max-w-md text-center text-lg text-white/80">
					This card rotates from 20 degrees to 0 as you scroll. It also scales smoothly to create a
					dramatic reveal effect.
				</p>
			</div>
		{/snippet}
	</ContainerScroll>
{/snippet}

<Story name="Default" {template} />

{#snippet imageCard()}
	<ContainerScroll>
		{#snippet titleContent()}
			<h2 class="text-foreground text-4xl font-semibold dark:text-white">
				Show off your <br />
				<span class="mt-1 text-4xl leading-none font-bold md:text-[6rem]">Product Shots</span>
			</h2>
		{/snippet}
		{#snippet cardContent()}
			<img
				src="https://picsum.photos/seed/container-scroll/1200/720"
				alt="Product preview"
				class="size-full object-cover"
			/>
		{/snippet}
	</ContainerScroll>
{/snippet}

<Story name="Image Card" template={imageCard} />
