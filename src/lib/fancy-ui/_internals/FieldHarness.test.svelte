<!--
  Test-only rig: publishes `field` under FIELD_KEY when given, then renders a
  FieldConsumer beneath it. `setContext`/`getContext` only resolve through a
  real component tree, so proving getField() sees a provider's value — and
  sees nothing at all with no `field` prop — needs two real component
  instances rather than a raw snippet. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext, untrack } from "svelte";
	import { FIELD_KEY, type FieldContext } from "./field.svelte.js";
	import FieldConsumer from "./FieldConsumer.test.svelte";

	interface Props {
		/** Omit to render the consumer with no provider above it at all. */
		field?: FieldContext;
	}

	let { field }: Props = $props();

	// setContext must run synchronously during this component's own
	// initialization, never inside an effect — so this deliberately reads
	// `field` exactly once, capturing whatever the harness was mounted with.
	// Publishing `undefined` explicitly is indistinguishable from publishing
	// nothing at all: getField() reads back `undefined` from the context map
	// either way, which is exactly the "no provider" case this harness needs
	// to produce. Wrapped in `untrack` so the compiler's
	// `state_referenced_locally` warning — which exists to catch a *reactive*
	// read that silently only fires once — doesn't fire on a read that is
	// deliberately one-shot.
	setContext(
		FIELD_KEY,
		untrack(() => field)
	);
</script>

<FieldConsumer />
