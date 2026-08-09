<!--
  Test-only rig proving Slider consumes the shared field context rather than
  throwing or ignoring it. Sets FIELD_KEY by hand instead of rendering a real
  FormField — this wave's components are built against the frozen
  FieldContext surface, not against each other, so a fake provider here is
  the one way to test the consumer side in isolation. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import { setContext } from "svelte";
	import Slider from "./Slider.svelte";
	import { FIELD_KEY, type FieldContext } from "../_internals/field.svelte.js";

	interface Props {
		context: FieldContext;
	}

	let { context }: Props = $props();

	setContext(FIELD_KEY, context);
</script>

<!-- Deliberately passed an own id that disagrees with the context, so a test
     can prove the context wins rather than merely matching by coincidence. -->
<Slider id="own-id" disabled={false} />
