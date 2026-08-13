<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Select } from "$lib/fancy-ui/select";

	const plans = [
		{ value: "starter", label: "Starter" },
		{ value: "team", label: "Team" },
		{ value: "enterprise", label: "Enterprise" },
	];

	let plan = $state("");
</script>

<FormField label="Plan" required error={plan === "" ? "Choose a plan to continue." : undefined}>
	<Select options={plans} bind:value={plan} placeholder="Select a plan" class="w-[220px]" />
</FormField>
