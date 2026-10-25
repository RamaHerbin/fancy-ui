<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { MathBubble } from "$lib/fancy-ui/math-bubble";

	const { Story } = defineMeta({
		title: "Text/MathBubble",
		component: MathBubble,
		tags: ["autodocs"],
		args: {
			formula: "e^{i\\pi}+1=0",
			bubble: "speech",
			tail: "bottom",
			tailOffset: 0.25,
			speed: 5,
			seed: 1,
			size: 32,
			strokeWidth: 2.2,
			ink: "currentColor",
			trigger: "mount",
			loop: false,
			hold: 1800,
		},
		argTypes: {
			formula: { control: "text", description: "Formula in a small TeX subset" },
			bubble: {
				control: "select",
				options: ["speech", "thought", "shout", "none"],
				description: "Outline drawn around the formula",
			},
			tail: {
				control: "select",
				options: ["left", "right", "bottom", "top"],
				description: "Side the tail points to",
			},
			tailOffset: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
			speed: { control: "number", description: "Writing speed, em per second" },
			seed: { control: "number", description: "Seed of the hand" },
			size: { control: "number", description: "Pixels per em" },
			strokeWidth: { control: "number", description: "Base pen width, px" },
			ink: { control: "color", description: "Ink colour" },
			trigger: {
				control: "select",
				options: ["inView", "mount", "manual"],
				description: "When the drawing starts",
			},
			loop: { control: "boolean", description: "Start again after the last formula" },
			hold: { control: "number", description: "Rest on a finished formula, ms" },
		},
	});
</script>

<Story name="Default" />

<Story
	name="Thought Bubble"
	args={{ formula: "\\frac{d}{dx}x^2=2x", bubble: "thought", tail: "left", tailOffset: 0.6 }}
/>

<Story name="Shout" args={{ formula: "a^2+b^2=c^2", bubble: "shout", tail: "top", seed: 7 }} />

<Story
	name="Loop"
	args={{ formula: ["E=mc^2", "\\sqrt{2}\\approx 1.414"], loop: true, hold: 1200 }}
/>
