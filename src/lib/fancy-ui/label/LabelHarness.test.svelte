<!--
  Test-only rig. Publishes a hand-built FieldContext directly through
  setContext rather than going through a real FormField, so a test gets
  precise control over exactly what the context reports — including making
  it disagree with Label's own `for`/`required` props, which is the only way
  to prove the context wins rather than merely matching it by coincidence.
  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext, untrack } from "svelte";
	import Label from "./Label.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		field: FieldContext;
		for?: string;
		required?: boolean;
		children?: Snippet;
	}

	let { field, for: forProp, required, children }: Props = $props();

	// One-shot on purpose — see FieldHarness.test.svelte's identical comment.
	// `untrack` keeps the compiler's state_referenced_locally warning, meant
	// for an *accidentally* non-reactive read, from firing on this
	// deliberate one.
	setContext(
		FIELD_KEY,
		untrack(() => field)
	);
</script>

<Label for={forProp} {required}>
	{#if children}{@render children()}{:else}Label{/if}
</Label>
