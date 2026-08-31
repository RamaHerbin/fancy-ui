<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";

	const regions = [
		{ value: "us", label: "United States" },
		{ value: "eu", label: "Europe" },
		{ value: "ap", label: "Asia Pacific (coming soon)", disabled: true },
	];

	let region = $state("us");
</script>

<Select sound options={regions} bind:value={region} label="Region" class="w-[240px]" />
