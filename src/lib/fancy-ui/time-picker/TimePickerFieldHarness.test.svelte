<!--
  Test-only rig. Publishes an optional FieldContext under FIELD_KEY before
  rendering a real TimePicker — exactly like `select/SelectHarness.test.svelte`
  does — so TimePicker's FormField integration is proven against the frozen
  `getField()`/`FieldContext` surface, without depending on the actual
  FormField component (a different builder's folder, not part of what this
  component consumes).

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import TimePicker from "./TimePicker.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		disabled?: boolean;
		required?: boolean;
		invalid?: boolean;
		/** Omit to render with no FormField provider above it at all. */
		field?: FieldContext;
	}

	let { disabled = false, required = false, invalid = false, field }: Props = $props();

	// Must run synchronously during this component's own initialization,
	// never inside an effect. Publishing `undefined` explicitly is the same
	// as publishing nothing — getField() reads back `undefined` either way.
	setContext(FIELD_KEY, field);
</script>

<!-- Deliberately passed own props that disagree with the context, so a test
     can prove the context wins rather than merely matching by coincidence. -->
<TimePicker id="own-id" {disabled} {required} {invalid} label="Slot" locale="en-US" />
