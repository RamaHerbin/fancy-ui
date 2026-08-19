<!--
  Test-only composition rig. Mounts ButtonGroup around a real child so the
  context probe can be exercised through actual markup rather than an
  invented value. Not exported from index.ts, and not collected by Vitest
  (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import ButtonGroup from "./ButtonGroup.svelte";
	import ButtonGroupContextProbe from "./ButtonGroupContextProbe.test.svelte";
	import type { ButtonGroupOrientation } from "./types.js";

	interface Props {
		orientation?: ButtonGroupOrientation;
	}

	let { orientation }: Props = $props();
</script>

<ButtonGroup {orientation} label="Probed group">
	<ButtonGroupContextProbe />
</ButtonGroup>
