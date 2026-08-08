<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { PasswordInput } from "$lib/fancy-ui/password-input";

	const { Story } = defineMeta({
		title: "Forms/PasswordInput",
		component: PasswordInput,
		tags: ["autodocs"],
		args: {
			placeholder: "Enter your password",
			label: "Password",
		},
		argTypes: {
			value: { control: "text", description: "Current value" },
			placeholder: { control: "text", description: "Shown while the field is empty" },
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			readonly: { control: "boolean", description: "Blocks typing, stays focusable and submitted" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
			autocomplete: {
				control: "select",
				options: ["current-password", "new-password", "off"],
				description: "new-password opts a password manager into generating one",
			},
			showToggle: { control: "boolean", description: "Renders the show/hide reveal button" },
			showStrength: { control: "boolean", description: "Renders the strength meter and label" },
			label: { control: "text", description: "Accessible name with no visible Label" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<PasswordInput {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Filled" {template} args={{ value: "hunter2" }} />

<Story name="No toggle" {template} args={{ value: "hunter2", showToggle: false }} />

<Story
	name="With strength"
	{template}
	args={{ value: "Abcdefghijkl1!", showStrength: true, autocomplete: "new-password" }}
/>

<Story name="Weak strength" {template} args={{ value: "a", showStrength: true }} />

<Story name="Error" {template} args={{ value: "ab", invalid: true }} />

<Story name="Disabled" {template} args={{ value: "hunter2", disabled: true }} />
