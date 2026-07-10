<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { LineShadowText } from "$lib/fancy-ui/line-shadow-text";

	const { Story } = defineMeta({
		title: "Text/LineShadowText",
		component: LineShadowText,
		tags: ["autodocs"],
		args: {
			text: "Text",
			shadowColor: "black",
			as: "span",
		},
		argTypes: {
			text: { control: "text", description: "Text content to display" },
			shadowColor: { control: "color", description: "Color of the diagonal line shadow" },
			as: {
				control: "select",
				options: ["span", "h1", "h2", "h3", "h4", "h5", "h6", "p", "div"],
				description: "HTML element to render as",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<p class="text-6xl leading-none font-bold">
		Shadow <LineShadowText {...args} class="italic" />
	</p>
{/snippet}

<Story name="Default" {template} />

<Story name="Colored Shadow" {template} args={{ text: "Neon", shadowColor: "#8b5cf6" }} />

<Story name="Heading Element" {template} args={{ text: "Title", as: "h1" }} />
