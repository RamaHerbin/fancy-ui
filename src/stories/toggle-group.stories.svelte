<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group";

	const { Story } = defineMeta({
		title: "Actions/ToggleGroup",
		component: ToggleGroup,
		tags: ["autodocs"],
		args: {
			type: "single",
			value: "left",
			disabled: false,
			size: "md",
			orientation: "horizontal",
			label: "Text alignment",
		},
		argTypes: {
			type: {
				control: "select",
				options: ["single", "multiple"],
				description: "Whether one item can be active at a time, or several",
			},
			value: { control: "text", description: "The active value(s) — a string or an array" },
			disabled: { control: "boolean", description: "Disables every item in the group" },
			size: { control: "select", options: ["sm", "md", "lg"], description: "Sizes every item" },
			orientation: {
				control: "select",
				options: ["horizontal", "vertical"],
				description: "The rail's stacking axis; both arrow-key pairs work either way",
			},
			label: { control: "text", description: "Accessible name for the group" },
		},
	});
</script>

{#snippet template(args: any)}
	<ToggleGroup {...args}>
		<ToggleGroupItem value="left" label="Align left">⇤</ToggleGroupItem>
		<ToggleGroupItem value="center" label="Align center">↔</ToggleGroupItem>
		<ToggleGroupItem value="right" label="Align right">⇥</ToggleGroupItem>
	</ToggleGroup>
{/snippet}

{#snippet multipleTemplate(args: any)}
	<ToggleGroup {...args}>
		<ToggleGroupItem value="bold" label="Bold"><strong>B</strong></ToggleGroupItem>
		<ToggleGroupItem value="italic" label="Italic"><em>I</em></ToggleGroupItem>
		<ToggleGroupItem value="underline" label="Underline">
			<span class="underline">U</span>
		</ToggleGroupItem>
	</ToggleGroup>
{/snippet}

{#snippet disabledTemplate(args: any)}
	<ToggleGroup {...args}>
		<ToggleGroupItem value="starter">Starter</ToggleGroupItem>
		<ToggleGroupItem value="team" disabled>Team</ToggleGroupItem>
		<ToggleGroupItem value="enterprise">Enterprise</ToggleGroupItem>
	</ToggleGroup>
{/snippet}

{#snippet sizesTemplate()}
	<div class="flex items-center gap-4">
		<ToggleGroup size="sm" value="center" label="Small">
			<ToggleGroupItem value="left" label="Align left">⇤</ToggleGroupItem>
			<ToggleGroupItem value="center" label="Align center">↔</ToggleGroupItem>
			<ToggleGroupItem value="right" label="Align right">⇥</ToggleGroupItem>
		</ToggleGroup>
		<ToggleGroup size="md" value="center" label="Medium">
			<ToggleGroupItem value="left" label="Align left">⇤</ToggleGroupItem>
			<ToggleGroupItem value="center" label="Align center">↔</ToggleGroupItem>
			<ToggleGroupItem value="right" label="Align right">⇥</ToggleGroupItem>
		</ToggleGroup>
		<ToggleGroup size="lg" value="center" label="Large">
			<ToggleGroupItem value="left" label="Align left">⇤</ToggleGroupItem>
			<ToggleGroupItem value="center" label="Align center">↔</ToggleGroupItem>
			<ToggleGroupItem value="right" label="Align right">⇥</ToggleGroupItem>
		</ToggleGroup>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Multiple selection"
	template={multipleTemplate}
	args={{ type: "multiple", value: ["bold"], label: "Formatting" }}
/>

<Story name="Vertical" {template} args={{ orientation: "vertical" }} />

<Story
	name="Disabled item"
	template={disabledTemplate}
	args={{ value: "starter", label: "Plan" }}
/>

<Story name="Disabled group" {template} args={{ disabled: true }} />

<Story name="Sizes" template={sizesTemplate} />
