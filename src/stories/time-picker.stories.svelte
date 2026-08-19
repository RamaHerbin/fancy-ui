<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { TimePicker } from "$lib/fancy-ui/time-picker";

	const { Story } = defineMeta({
		title: "Forms/TimePicker",
		component: TimePicker,
		tags: ["autodocs"],
		args: {
			placeholder: "Select a time",
			step: 30,
			hour12: false,
			disabled: false,
			required: false,
			invalid: false,
		},
		argTypes: {
			value: { control: "text", description: 'The selected time, "HH:mm" 24-hour, bindable' },
			placeholder: {
				control: "text",
				description: "Shown in the trigger while no time is selected",
			},
			step: { control: "number", description: "Minutes between generated slots" },
			hour12: { control: "boolean", description: "Display only — 12-hour clock with AM/PM" },
			disabled: { control: "boolean", description: "Blocks opening the panel" },
			required: { control: "boolean", description: "Marks the field required" },
			invalid: { control: "boolean", description: "Drives the error border and aria-invalid" },
			locale: { control: "text", description: "BCP 47 locale for slot formatting" },
		},
	});
</script>

{#snippet template(args: any)}
	<TimePicker {...args} class="w-[180px]" />
{/snippet}

<Story name="Default" {template} />

<Story name="Selected" {template} args={{ value: "14:30" }} />

<Story name="12-hour display" {template} args={{ value: "14:30", hour12: true }} />

<Story name="15-minute steps" {template} args={{ step: 15 }} />

<Story name="Business hours" {template} args={{ min: "09:00", max: "17:00" }} />

<Story name="Disabled" {template} args={{ disabled: true }} />

<Story name="Invalid" {template} args={{ invalid: true }} />
