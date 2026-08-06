<!--
  Test-only rig for the one thing a `.ts` test cannot set up: the marker inside
  real prose, with punctuation pressed straight up against it. Whether the
  component leaks a whitespace text node of its own is only observable from the
  outside, in the sentence it interrupts. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import type { SourceData } from "../_internals/ai-types.js";
	import InlineCitation from "./InlineCitation.svelte";

	interface Props {
		source: SourceData;
		index?: number;
		href?: string;
	}

	let { source, index = 1, href }: Props = $props();
</script>

<p data-testid="prose">Worth a read<InlineCitation {source} {index} {href} />.</p>
