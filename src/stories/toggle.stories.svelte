<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Toggle } from "$lib/fancy-ui/toggle";

	const { Story } = defineMeta({
		title: "Actions/Toggle",
		component: Toggle,
		tags: ["autodocs"],
		args: {
			pressed: false,
			disabled: false,
			size: "md",
			variant: "ghost",
			label: "Bold",
		},
		argTypes: {
			pressed: { control: "boolean", description: "Whether the toggle is currently pressed" },
			disabled: { control: "boolean", description: "Disables the toggle" },
			size: { control: "select", options: ["sm", "md", "lg"], description: "Visual size" },
			variant: {
				control: "select",
				options: ["ghost", "outline"],
				description: "Ghost has no resting border, outline keeps one",
			},
			label: { control: "text", description: "Accessible name for icon-only content" },
		},
	});
</script>

{#snippet template(args: any)}
	<Toggle {...args}>
		<strong>B</strong>
	</Toggle>
{/snippet}

{#snippet sizesTemplate()}
	<div class="flex items-center gap-3">
		<Toggle size="sm" pressed label="Small, pressed"><strong>B</strong></Toggle>
		<Toggle size="md" pressed label="Medium, pressed"><strong>B</strong></Toggle>
		<Toggle size="lg" pressed label="Large, pressed"><strong>B</strong></Toggle>
	</div>
{/snippet}

{#snippet variantsTemplate()}
	<div class="flex items-center gap-6">
		<div class="flex items-center gap-2">
			<Toggle variant="ghost" label="Ghost, resting"><strong>B</strong></Toggle>
			<Toggle variant="ghost" pressed label="Ghost, pressed"><strong>B</strong></Toggle>
		</div>
		<div class="flex items-center gap-2">
			<Toggle variant="outline" label="Outline, resting"><strong>B</strong></Toggle>
			<Toggle variant="outline" pressed label="Outline, pressed"><strong>B</strong></Toggle>
		</div>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Pressed" {template} args={{ pressed: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Sizes" template={sizesTemplate} />

<Story name="Variants" template={variantsTemplate} />
