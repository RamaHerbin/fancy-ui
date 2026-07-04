<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ConfettiButton } from "$lib/fancy-ui/confetti";

	const { Story } = defineMeta({
		title: "Effects/ConfettiButton",
		component: ConfettiButton,
		tags: ["autodocs"],
		args: {
			options: {},
		},
		argTypes: {
			options: { control: "object", description: "canvas-confetti options merged into each burst" },
		},
	});
</script>

{#snippet template(args: any)}
	<ConfettiButton {...args}>
		<span
			class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors"
		>
			Click for confetti!
		</span>
	</ConfettiButton>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Big Burst"
	{template}
	args={{ options: { particleCount: 200, spread: 120, startVelocity: 45 } }}
/>

<Story
	name="Custom Colors"
	{template}
	args={{ options: { colors: ["#22d3ee", "#a855f7", "#f472b6"], particleCount: 120 } }}
/>
