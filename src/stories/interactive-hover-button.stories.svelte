<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { InteractiveHoverButton } from "$lib/fancy-ui/interactive-hover-button";

	const { Story } = defineMeta({
		title: "Buttons/InteractiveHoverButton",
		component: InteractiveHoverButton,
		tags: ["autodocs"],
		args: {
			text: "Button",
		},
		argTypes: {
			text: { control: "text", description: "Button label text" },
			class: { control: "text", description: "Custom CSS class" },
		},
	});
</script>

<Story name="Default" />

<Story name="Custom Text" args={{ text: "Get Started" }} />

<Story name="Custom Styling" args={{ text: "Wide Button", class: "px-12 text-lg" }} />
