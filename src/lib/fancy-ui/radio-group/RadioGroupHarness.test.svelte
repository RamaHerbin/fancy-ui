<!--
  Test-only rig. Renders a real RadioGroup with real RadioGroupItem children —
  a raw HTML string from a `.ts` test file would carry neither the group's
  context nor the browser's own native radio grouping. `bind:value` is
  forwarded through this component's own bindable prop so a test can
  round-trip a selection the same way ToggleGroup's harness does.

  The optional `field` prop publishes a FieldContext under FIELD_KEY before
  rendering the group, exactly like `_internals/FieldHarness.test.svelte`
  does — this is how RadioGroup's FormField integration is proven without
  depending on the actual FormField component, which lives in a different
  builder's folder and is not part of the frozen surface this component
  consumes (only FIELD_KEY/FieldContext/getField are).

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import RadioGroup from "./RadioGroup.svelte";
	import RadioGroupItem from "./RadioGroupItem.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Item {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		items: Item[];
		value?: string;
		onValueChange?: (value: string) => void;
		name?: string;
		disabled?: boolean;
		required?: boolean;
		invalid?: boolean;
		orientation?: "horizontal" | "vertical";
		label?: string;
		/** Omit to render with no FormField provider above it at all. */
		field?: FieldContext;
		sound?: boolean;
	}

	let {
		items,
		value = $bindable(""),
		onValueChange,
		name,
		disabled = false,
		required = false,
		invalid = false,
		orientation = "vertical",
		label = "Test group",
		field,
		sound = false,
	}: Props = $props();

	// Must run synchronously during this component's own initialization,
	// never inside an effect. Publishing `undefined` explicitly is the same
	// as publishing nothing — getField() reads back `undefined` either way.
	setContext(FIELD_KEY, field);
</script>

<RadioGroup
	{name}
	bind:value
	{onValueChange}
	{disabled}
	{required}
	{invalid}
	{orientation}
	{label}
	{sound}
>
	{#each items as item (item.value)}
		<RadioGroupItem value={item.value} disabled={item.disabled} label={item.label} />
	{/each}
</RadioGroup>
