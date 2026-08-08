<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";

	const { Story } = defineMeta({
		title: "Forms/RadioGroup",
		component: RadioGroup,
		tags: ["autodocs"],
		args: {
			value: "a",
			disabled: false,
			required: false,
			invalid: false,
			orientation: "vertical",
			label: "Options",
		},
		argTypes: {
			value: { control: "text", description: "The selected value, bindable" },
			disabled: { control: "boolean", description: "Disables every item in the group" },
			required: { control: "boolean", description: "Marks the group required" },
			invalid: { control: "boolean", description: "Marks the group invalid" },
			orientation: {
				control: "select",
				options: ["horizontal", "vertical"],
				description: "The list's stacking axis",
			},
			label: { control: "text", description: "Accessible name for the group" },
		},
	});
</script>

{#snippet template(args: any)}
	<RadioGroup {...args}>
		<RadioGroupItem value="a" label="Option A" />
		<RadioGroupItem value="b" label="Option B" />
		<RadioGroupItem value="c" label="Option C" />
	</RadioGroup>
{/snippet}

{#snippet disabledItemTemplate(args: any)}
	<RadioGroup {...args}>
		<RadioGroupItem value="starter" label="Starter" />
		<RadioGroupItem value="team" label="Team (unavailable)" disabled />
		<RadioGroupItem value="enterprise" label="Enterprise" />
	</RadioGroup>
{/snippet}

<Story name="Default" {template} />

<Story name="Horizontal" {template} args={{ orientation: "horizontal" }} />

<Story
	name="Disabled item"
	template={disabledItemTemplate}
	args={{ value: "starter", label: "Plan" }}
/>

<Story name="Disabled group" {template} args={{ disabled: true }} />

<Story name="Invalid" {template} args={{ value: "", invalid: true }} />

<Story name="Required" {template} args={{ value: "", required: true }} />
