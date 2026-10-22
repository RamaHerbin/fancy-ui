<!--
  Test-only rig: a FormField context above a group that takes an attribute bag,
  so the describedby-merge test can reach the root. Not exported from index.ts,
  and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import RadioGroup from "./RadioGroup.svelte";
	import RadioGroupItem from "./RadioGroupItem.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		context: FieldContext;
		groupAttrs?: Record<string, unknown>;
	}

	let { context, groupAttrs = {} }: Props = $props();

	// Test rig: the field context is published once from the initial prop.
	// svelte-ignore state_referenced_locally
	setContext(FIELD_KEY, context);
</script>

<RadioGroup label="Pick" {...groupAttrs}>
	<RadioGroupItem value="a" label="Option A" />
</RadioGroup>
