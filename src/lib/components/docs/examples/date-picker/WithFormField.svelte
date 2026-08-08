<script lang="ts">
	// FormField renders its own internal Label from the `label` prop below and
	// derives invalid state from whether `error` is set — it supplies
	// controlId, aria-describedby and aria-invalid to DatePicker through
	// context, so DatePicker itself needs no id or invalid prop here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { DatePicker } from "$lib/fancy-ui/date-picker";

	let deadline = $state<Date | null>(null);
</script>

<FormField
	label="Deadline"
	required
	error={deadline ? undefined : "Pick a deadline before continuing."}
	class="w-full max-w-sm"
>
	<DatePicker bind:value={deadline} />
</FormField>
