<!--
  Test-only rig: a real FormField wrapping the FormFieldControl stand-in, so
  the compound's tests can exercise the actual context propagation — id,
  aria-describedby, aria-invalid, required, disabled all reaching a real
  child component through real context, not a hand-built object. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import FormField from "./FormField.svelte";
	import FormFieldControl from "./FormFieldControl.test.svelte";
	import type { FormFieldProps } from "./types.js";

	let {
		label,
		description,
		error,
		valid,
		required,
		disabled,
		id,
	}: Pick<
		FormFieldProps,
		"label" | "description" | "error" | "valid" | "required" | "disabled" | "id"
	> = $props();
</script>

<FormField {label} {description} {error} {valid} {required} {disabled} {id}>
	<FormFieldControl />
</FormField>
