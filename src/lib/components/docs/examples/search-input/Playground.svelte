<script lang="ts">
	import { SearchInput } from "$lib/fancy-ui/search-input";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { searchInputCode } from "./code.js";

	let query = $state("");
</script>

<PropsPlayground
	component="SearchInput"
	slug="search-input"
	codeFor={searchInputCode}
	controls={[
		{ key: "placeholder", type: "text", label: "Placeholder", maxLength: 40 },
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "debounceMs", type: "range", label: "Debounce (ms)", min: 0, max: 1000, step: 50 },
		{ key: "clearable", type: "boolean", label: "Clearable" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "readonly", type: "boolean", label: "Read only" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		placeholder: "Search components",
		label: "Search",
		debounceMs: 0,
		clearable: true,
		disabled: false,
		readonly: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-72 max-w-[85vw]">
			<SearchInput
				bind:value={query}
				placeholder={values.placeholder as string}
				label={values.label as string}
				debounceMs={values.debounceMs as number}
				clearable={values.clearable as boolean}
				disabled={values.disabled as boolean}
				readonly={values.readonly as boolean}
				required={values.required as boolean}
				invalid={values.invalid as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
