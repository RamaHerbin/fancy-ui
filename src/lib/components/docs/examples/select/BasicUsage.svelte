<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";

	const frameworks = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("svelte");
</script>

<Select
	sound
	options={frameworks}
	bind:value={framework}
	label="Framework"
	placeholder="Choose a framework"
	class="w-[220px]"
/>
