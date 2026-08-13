<!--
  Test-only rig proving Combobox consumes the shared field context rather
  than throwing or ignoring it. Sets FIELD_KEY by hand instead of rendering a
  real FormField — this wave's components are built against the frozen
  FieldContext surface, not against each other, so a fake provider here is
  the one way to test the consumer side in isolation. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import Combobox from "./Combobox.svelte";
	import type { ComboboxOption } from "./types.js";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		options: ComboboxOption[];
		context: FieldContext;
		/**
		 * Combobox's own props, deliberately configurable rather than
		 * hardcoded — a test needs both polarities to actually distinguish `??`
		 * from `||`: context `true` beating own `false` (the default values
		 * below), and context `false` beating own `true` (passed explicitly).
		 * `true || false` and `true ?? false` agree, so only the second
		 * polarity can catch a `??` → `||` regression.
		 */
		id?: string;
		disabled?: boolean;
		required?: boolean;
		invalid?: boolean;
	}

	let {
		options,
		context,
		id = "own-id",
		disabled = false,
		required = false,
		invalid = false,
	}: Props = $props();

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

<!-- Own props default to disagreeing with a "everything true" context (the
     existing test), but are overridable so a test can also disagree the
     other way — own true, context false. -->
<Combobox {options} {id} {invalid} {required} {disabled} />
