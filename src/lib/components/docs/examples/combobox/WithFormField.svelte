<script lang="ts">
	// FormField supplies controlId, aria-describedby and aria-invalid to
	// Combobox through context — no id or invalid prop needed here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Combobox } from "$lib/fancy-ui/combobox";

	const frameworks = [
		{ value: "svelte-5", label: "Svelte 5" },
		{ value: "sveltekit", label: "SvelteKit" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("");
</script>

<FormField
	label="Framework"
	required
	error={framework ? undefined : "Pick a framework before continuing."}
	class="w-full max-w-sm"
>
	<Combobox options={frameworks} bind:value={framework} />
</FormField>
