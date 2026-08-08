<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Input } from "$lib/fancy-ui/input";

	const { Story } = defineMeta({
		title: "Forms/Input",
		component: Input,
		tags: ["autodocs"],
		args: {
			type: "text",
			placeholder: "Placeholder…",
			label: "Example field",
		},
		argTypes: {
			value: { control: "text", description: "Current value" },
			type: {
				control: "select",
				options: ["text", "email", "url", "tel", "password", "search", "number"],
				description: "Native input type",
			},
			placeholder: { control: "text", description: "Shown while the field is empty" },
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			readonly: { control: "boolean", description: "Blocks typing, stays focusable and submitted" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
			label: { control: "text", description: "Accessible name with no visible Label" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<Input {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Focus" {template} args={{ placeholder: "Click or tab to me" }} />

<Story name="Error" {template} args={{ value: "ab", invalid: true }} />

<Story name="Disabled" {template} args={{ value: "Disabled", disabled: true }} />

<Story
	name="Password"
	{template}
	args={{ type: "password", value: "hunter2", label: "Password" }}
/>
