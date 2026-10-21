<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import type { Framework } from "$lib/inspiration/types.js";

	const options = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let value = $state("");

	const str = (text: unknown) => JSON.stringify(String(text));

	const optionsCode = `const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];`;

	/** The options list and the selected value live next to the tag, so the code shows them. */
	function codeFor(values: Record<string, string | number | boolean>, framework: Framework) {
		const disabled = values.disabled ? "disabled" : "";
		const attrs = (binding: string, list: string) =>
			[
				binding,
				list,
				`label=${str(values.label)}`,
				`placeholder=${str(values.placeholder)}`,
				disabled,
			]
				.filter(Boolean)
				.map((a) => `\t${a}`)
				.join("\n");
		if (framework === "react") {
			return `${optionsCode}

<Select
${attrs("value={framework}\n\tonValueChange={setFramework}", "options={frameworks}")}
/>`;
		}
		if (framework === "vue") {
			return `${optionsCode}

<Select
${attrs('v-model:value="framework"', ':options="frameworks"')}
/>`;
		}
		return `${optionsCode}

<Select
${attrs("bind:value={framework}", "options={frameworks}")}
/>`;
	}
</script>

<PropsPlayground
	component="Select"
	slug="select"
	{codeFor}
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
