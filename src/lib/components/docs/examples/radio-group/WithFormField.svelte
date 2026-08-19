<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
	import { RadioGroup, RadioGroupItem } from "$lib/fancy-ui/radio-group";

	let method = $state("");
</script>

<FormField
	label="Shipping method"
	required
	error={method === "" ? "Choose a shipping method to continue." : undefined}
>
	<RadioGroup bind:value={method}>
		<RadioGroupItem value="standard" label="Standard — 5 to 7 days" />
		<RadioGroupItem value="express" label="Express — 2 days" />
		<RadioGroupItem value="overnight" label="Overnight" />
	</RadioGroup>
</FormField>
