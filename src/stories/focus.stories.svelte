<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Focus } from "$lib/fancy-ui/focus";

	const { Story } = defineMeta({
		title: "Text/Focus",
		component: Focus,
		tags: ["autodocs"],
		args: {
			sentence: "Build beautiful interfaces easily",
			manualMode: false,
			blurAmount: 5,
			borderColor: "green",
			animationDuration: 0.5,
			pauseBetweenAnimations: 1,
		},
		argTypes: {
			sentence: {
				control: "text",
				description: "Space-separated words to cycle focus through",
			},
			manualMode: {
				control: "boolean",
				description: "Enable manual control via mouse hover instead of auto-cycling",
			},
			blurAmount: {
				control: "number",
				description: "Blur amount in pixels for unfocused words",
			},
			borderColor: { control: "color", description: "Color of the corner frame border" },
			animationDuration: {
				control: "number",
				description: "Transition duration in seconds",
			},
			pauseBetweenAnimations: {
				control: "number",
				description: "Pause between word cycles in seconds",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="flex min-h-[160px] items-center justify-center text-3xl font-bold">
		<Focus {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Manual Mode"
	{template}
	args={{ manualMode: true, sentence: "Hover each word here" }}
/>

<Story name="High Blur" {template} args={{ blurAmount: 12, borderColor: "#e11d48" }} />
