<script lang="ts">
	// The default filter matches substrings of the label. This one matches
	// only a prefix of the *value* instead, so typing the short slug ("sk")
	// finds "SvelteKit" even though "sk" never appears in its label.
	import { Combobox, type ComboboxOption } from "$lib/fancy-ui/combobox";

	const frameworks: ComboboxOption[] = [
		{ value: "svelte-5", label: "Svelte 5" },
		{ value: "sk", label: "SvelteKit" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("");

	function filterByValuePrefix(option: ComboboxOption, query: string): boolean {
		return option.value.toLowerCase().startsWith(query.toLowerCase());
	}
</script>

<Combobox
	sound
	options={frameworks}
	bind:value={framework}
	filter={filterByValuePrefix}
	label="Framework (matched by slug)"
	placeholder="Try “sk”…"
/>
