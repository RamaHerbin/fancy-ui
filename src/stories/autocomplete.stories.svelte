<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Autocomplete } from "$lib/fancy-ui/autocomplete";

	const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];

	const { Story } = defineMeta({
		title: "Forms/Autocomplete",
		component: Autocomplete,
		tags: ["autodocs"],
		args: {
			suggestions: cities,
			placeholder: "Type a city…",
			label: "City",
			minLength: 1,
			maxSuggestions: 8,
			disabled: false,
			required: false,
			invalid: false,
		},
		argTypes: {
			placeholder: { control: "text", description: "Shown while the field is empty" },
			label: { control: "text", description: "Accessible name with no visible Label" },
			minLength: { control: "number", description: "Characters required before suggesting" },
			maxSuggestions: { control: "number", description: "Maximum suggestions shown at once" },
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<Autocomplete {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Prefilled" {template} args={{ value: "par" }} />

<Story name="Requires 3 characters" {template} args={{ minLength: 3 }} />

<Story name="Error" {template} args={{ invalid: true }} />

<Story name="Disabled" {template} args={{ value: "Paris", disabled: true }} />
