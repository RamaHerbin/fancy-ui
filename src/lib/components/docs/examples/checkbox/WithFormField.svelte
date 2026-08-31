<script lang="ts">
	// FormField renders its own internal Label from the `label` prop below and
	// derives invalid state from whether `error` is set — it supplies
	// controlId, aria-describedby and aria-invalid to Checkbox through
	// context, so Checkbox itself needs no id or invalid prop here. The
	// FormField's `label` ("Terms") is a group heading; Checkbox's own
	// children ("I agree...") is still the control's own accessible label —
	// the two serve different purposes.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Checkbox } from "$lib/fancy-ui/checkbox";

	let agreed = $state(false);
</script>

<FormField
	label="Terms"
	required
	error={agreed ? undefined : "You must agree before continuing."}
	class="w-full max-w-sm"
>
	<Checkbox sound bind:checked={agreed}>I agree to the terms and conditions</Checkbox>
</FormField>
