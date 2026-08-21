<!--
  Test-only rig proving Checkbox consumes the shared field context rather than
  throwing or ignoring it. Sets FIELD_KEY by hand instead of rendering a real
  FormField — this wave's components are built against the frozen
  FieldContext surface, not against each other, so a fake provider here is
  the one way to test the consumer side in isolation. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import Checkbox from "./Checkbox.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		context: FieldContext;
		sound?: boolean;
	}

	let { context, sound = false }: Props = $props();

	setContext(FIELD_KEY, context);
</script>

<!-- Deliberately passed own props that disagree with the context, so a test
     can prove the context wins rather than merely matching by coincidence. -->
<Checkbox id="own-id" invalid={false} required={false} disabled={false} label="Agree" {sound} />
