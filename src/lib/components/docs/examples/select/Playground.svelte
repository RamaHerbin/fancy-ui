<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { selectCode } from "./code.js";

	const options = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let value = $state("");
</script>

<PropsPlayground
	component="Select"
	slug="select"
	codeFor={selectCode}
	constraints={[
		'`options` is an array of `{ value, label }`; the selected value is a string, `""` when nothing is chosen.',
		"Give it a `label`: it names the control for assistive technology.",
	]}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 40 },
		{ key: "placeholder", type: "text", label: "Placeholder", maxLength: 40 },
		{ key: "disabled", type: "boolean", label: "Disabled" },
	]}
	initialValues={{ label: "Framework", placeholder: "Choose a framework", disabled: false }}
>
	{#snippet preview(values)}
		<Select
			{options}
			bind:value
			label={values.label as string}
			placeholder={values.placeholder as string}
			disabled={values.disabled as boolean}
			class="w-[220px]"
		/>
	{/snippet}
</PropsPlayground>
