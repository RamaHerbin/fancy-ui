<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Checkbox } from "$lib/fancy-ui/checkbox";

	const { Story } = defineMeta({
		title: "Forms/Checkbox",
		component: Checkbox,
		tags: ["autodocs"],
		args: {
			checked: false,
			indeterminate: false,
			disabled: false,
			invalid: false,
			required: false,
		},
		argTypes: {
			checked: { control: "boolean", description: "Whether the box is checked" },
			indeterminate: { control: "boolean", description: "Mixed/dash visual state" },
			disabled: { control: "boolean", description: "Blocks interaction" },
			invalid: { control: "boolean", description: "Drives the error border and aria-invalid" },
			required: { control: "boolean", description: "Native required" },
			label: { control: "text", description: "Accessible name with no visible children" },
		},
	});
</script>

{#snippet template(args: any)}
	<Checkbox {...args}>I agree to the terms and conditions</Checkbox>
{/snippet}

{#snippet statesTemplate()}
	<div class="flex flex-col gap-3">
		<Checkbox checked={false}>Unchecked</Checkbox>
		<Checkbox checked={true}>Checked</Checkbox>
		<Checkbox checked={false} indeterminate={true}>Indeterminate</Checkbox>
		<Checkbox checked={false} disabled>Disabled</Checkbox>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Checked" {template} args={{ checked: true }} />

<Story name="Indeterminate" {template} args={{ indeterminate: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Invalid" {template} args={{ invalid: true }} />

<Story name="States" template={statesTemplate} />
