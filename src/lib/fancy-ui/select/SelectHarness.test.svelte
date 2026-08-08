<!--
  Test-only rig. Publishes an optional FieldContext under FIELD_KEY before
  rendering a real Select — exactly like `radio-group/RadioGroupHarness.test.svelte`
  and `_internals/FieldHarness.test.svelte` do — so Select's FormField
  integration is proven against the frozen `getField()`/`FieldContext`
  surface, without depending on the actual FormField component (a different
  builder's folder, not part of what this component consumes).

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import Select, { type SelectOption } from "./Select.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		options: SelectOption[];
		value?: string;
		onValueChange?: (value: string) => void;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		invalid?: boolean;
		id?: string;
		name?: string;
		label?: string;
		/** Omit to render with no FormField provider above it at all. */
		field?: FieldContext;
	}

	let {
		options,
		value = $bindable(""),
		onValueChange,
		placeholder,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		label = "Framework",
		field,
	}: Props = $props();

	// Must run synchronously during this component's own initialization,
	// never inside an effect. Publishing `undefined` explicitly is the same
	// as publishing nothing — getField() reads back `undefined` either way.
	setContext(FIELD_KEY, field);
</script>

<Select
	{options}
	bind:value
	{onValueChange}
	{placeholder}
	{disabled}
	{required}
	{invalid}
	{id}
	{name}
	{label}
/>
