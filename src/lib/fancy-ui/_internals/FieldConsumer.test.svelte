<!--
  Test-only rig: a stand-in for "any control in this wave". It calls
  getField() the same way a real one would and dumps the result onto its own
  attributes so a test can read it back — proving `undefined` outside a
  provider, and the exact object a provider published inside one. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import { getField } from "./field.svelte.js";

	const field = getField();
</script>

<div
	data-testid="consumer"
	data-has-field={field !== undefined}
	data-control-id={field?.controlId}
	data-label-id={field?.labelId}
	data-described-by={field?.describedBy}
	data-invalid={field?.invalid}
	data-valid={field?.valid}
	data-required={field?.required}
	data-disabled={field?.disabled}
></div>
