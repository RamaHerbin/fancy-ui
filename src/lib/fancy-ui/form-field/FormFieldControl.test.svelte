<!--
  Test-only rig standing in for a real control from this wave (Input, Select,
  ...) — none of which live in this folder, and none of which exist yet in
  this working tree. It reads getField() exactly the way a real control is
  expected to: context wins over its own id/required/disabled whenever a
  FormField is present. Rendering this inside FormField's `children` proves
  the wiring end-to-end without depending on a sibling component built
  elsewhere in this wave. Not exported from index.ts, and not collected by
  Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { getField } from "../_internals/field.svelte.js";

	interface Props {
		id?: string;
		required?: boolean;
		disabled?: boolean;
	}

	let { id, required = false, disabled = false }: Props = $props();

	const field = getField();
	const resolvedId = $derived(field?.controlId ?? id);
	const resolvedRequired = $derived(field?.required ?? required);
	const resolvedDisabled = $derived(field?.disabled ?? disabled);
</script>

<input
	type="text"
	id={resolvedId}
	required={resolvedRequired}
	disabled={resolvedDisabled}
	aria-invalid={field?.invalid ? "true" : undefined}
	aria-describedby={field?.describedBy}
	data-valid={field?.valid}
	data-label-id={field?.labelId}
/>
