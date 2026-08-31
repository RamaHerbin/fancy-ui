<script lang="ts">
	import { Combobox } from "$lib/fancy-ui/combobox";

	const frameworks = [
		{ value: "svelte-5", label: "Svelte 5" },
		{ value: "sveltekit", label: "SvelteKit" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("");
</script>

<Combobox
	sound
	options={frameworks}
	bind:value={framework}
	label="Framework"
	placeholder="Search…"
/>
