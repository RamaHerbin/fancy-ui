<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Select } from "$lib/fancy-ui/select";

	const FRAMEWORKS = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	const { Story } = defineMeta({
		title: "Forms/Select",
		component: Select,
		tags: ["autodocs"],
		args: {
			options: FRAMEWORKS,
			value: "svelte",
			placeholder: "Choose a framework",
			disabled: false,
			required: false,
			invalid: false,
			side: "bottom",
			align: "start",
		},
		argTypes: {
			value: { control: "text", description: "The selected value, bindable" },
			placeholder: {
				control: "text",
				description: "Shown in the trigger while nothing is selected",
			},
			disabled: { control: "boolean", description: "Blocks opening and form submission" },
			required: { control: "boolean", description: "Marks the control required" },
			invalid: { control: "boolean", description: "Drives the error border and aria-invalid" },
			side: {
				control: "select",
				options: ["top", "right", "bottom", "left"],
				description: "Side of the trigger to place the panel on",
			},
			align: {
				control: "select",
				options: ["start", "center", "end"],
				description: "Alignment along the trigger's cross axis",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<Select {...args} class="w-[220px]" />
{/snippet}

<Story name="Default" {template} />

<Story name="Nothing selected" {template} args={{ value: "" }} />

<Story
	name="Disabled option"
	{template}
	args={{
		options: [
			{ value: "svelte", label: "Svelte 5" },
			{ value: "react", label: "React" },
			{ value: "angular", label: "Angular (unsupported)", disabled: true },
		],
	}}
/>

<Story name="Right, start-aligned" {template} args={{ side: "right", align: "start" }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Invalid" {template} args={{ invalid: true }} />

<Story name="Required" {template} args={{ value: "", required: true }} />
