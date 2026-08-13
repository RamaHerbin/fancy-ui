<!--
  Test-only rig proving FileUpload consumes the shared field context rather
  than throwing or ignoring it. Sets FIELD_KEY by hand instead of rendering a
  real FormField — this wave's components are built against the frozen
  FieldContext surface, not against each other, so a fake provider here is
  the one way to test the consumer side in isolation. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import FileUpload from "./FileUpload.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		context: FieldContext;
	}

	let { context }: Props = $props();

	// Getters, not the object itself: setContext runs once at mount, so a
	// direct reference would freeze whatever `context` pointed to at that
	// instant — see svelte.dev/e/state_referenced_locally.
	setContext<FieldContext>(FIELD_KEY, {
		get controlId() {
			return context.controlId;
		},
		get describedBy() {
			return context.describedBy;
		},
		get invalid() {
			return context.invalid;
		},
		get valid() {
			return context.valid;
		},
		get required() {
			return context.required;
		},
		get disabled() {
			return context.disabled;
		},
	});
</script>

<!-- Deliberately passed own props that disagree with the context, so a test
     can prove the context wins rather than merely matching by coincidence. -->
<FileUpload id="own-id" invalid={false} required={false} disabled={false} />
