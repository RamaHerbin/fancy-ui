<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Combobox } from "$lib/fancy-ui/combobox";

	const frameworks = [
		{ value: "svelte-5", label: "Svelte 5" },
		{ value: "sveltekit", label: "SvelteKit" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
		{ value: "angular", label: "Angular", disabled: true },
	];

	const { Story } = defineMeta({
		title: "Forms/Combobox",
		component: Combobox,
		tags: ["autodocs"],
		args: {
			options: frameworks,
			placeholder: "Search…",
			label: "Framework",
			emptyMessage: "No results",
			disabled: false,
			required: false,
			invalid: false,
		},
		argTypes: {
			placeholder: { control: "text", description: "Shown while the field is empty" },
			label: { control: "text", description: "Accessible name with no visible Label" },
			emptyMessage: { control: "text", description: "Shown when no option matches the query" },
			disabled: { control: "boolean", description: "Blocks focus and typing" },
			required: { control: "boolean", description: "Native required" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-80">
		<Combobox {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Selected" {template} args={{ value: "sveltekit" }} />

<Story name="With a disabled option" {template} args={{ value: "react" }} />

<Story name="Error" {template} args={{ invalid: true }} />

<Story name="Disabled" {template} args={{ value: "svelte-5", disabled: true }} />
