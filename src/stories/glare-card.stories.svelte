<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { GlareCard } from "$lib/fancy-ui/glare-card";

	const { Story } = defineMeta({
		title: "Cards/GlareCard",
		component: GlareCard,
		tags: ["autodocs"],
	});
</script>

{#snippet template(args: any)}
	<GlareCard {...args}>
		<div class="flex size-full flex-col items-center justify-center bg-neutral-900 p-6 text-white">
			<h3 class="text-2xl font-bold">Holographic</h3>
			<p class="mt-2 text-sm text-slate-300">Move your mouse to see the effect</p>
		</div>
	</GlareCard>
{/snippet}

<Story name="Default" {template} />

{#snippet imageCard(args: any)}
	<GlareCard {...args}>
		<img
			src="https://picsum.photos/seed/holo/400/560"
			alt="Holographic foil"
			class="size-full object-cover"
		/>
	</GlareCard>
{/snippet}

<Story name="Image Content" template={imageCard} />
