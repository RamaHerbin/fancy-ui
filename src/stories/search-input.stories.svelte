<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { SearchInput } from "$lib/fancy-ui/search-input";

	const { Story } = defineMeta({
		title: "Forms/SearchInput",
		component: SearchInput,
		tags: ["autodocs"],
		args: {
			placeholder: "Search",
			label: "Search",
		},
		argTypes: {
			value: { control: "text", description: "Current value" },
			placeholder: { control: "text", description: "Shown while the field is empty" },
			debounceMs: {
				control: "number",
				description: "Delay before onSearch fires on its own; 0 disables debouncing",
			},
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			readonly: { control: "boolean", description: "Blocks typing and clearing, stays focusable" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
			clearable: {
				control: "boolean",
				description: "Renders a clear button once there is content",
			},
			label: { control: "text", description: "Accessible name with no visible Label" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<SearchInput {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Filled" {template} args={{ value: "displacement" }} />

<Story name="Not clearable" {template} args={{ value: "displacement", clearable: false }} />

<Story name="Error" {template} args={{ value: "!!", invalid: true }} />

<Story name="Disabled" {template} args={{ value: "Disabled", disabled: true }} />

<Story name="Debounced" {template} args={{ debounceMs: 300 }} />
