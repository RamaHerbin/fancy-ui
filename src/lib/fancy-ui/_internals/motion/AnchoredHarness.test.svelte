<!--
  Test-only rig: mounts a `{#if open}` block whose element carries the
  `anchored` transition and the matching static `style:transform-origin`,
  i.e. the exact call-site shape the twelve floating panels use. A test can
  toggle `open` via rerender() and prove the transition drives the node
  through a real mount/unmount cycle — either through the
  `Element.prototype.animate` stub in `src/test-setup.ts` (non-zero
  duration), or through Svelte's own duration-falsy short-circuit (the
  reduced-motion path: duration 0, synchronous, animate() never called).

  It uses one bidirectional `transition:` directive so a single toggle
  exercises both directions; the shipping panels use `in:` only, which is a
  call-site decision (an entrance-only panel must never delay its own
  unmount), not a limitation of the transition itself.

  Not exported from index.ts, and not collected by Vitest directly (the run
  includes `*.test.ts` only) — imported and rendered from anchored.test.ts.
-->
<script lang="ts">
	import { anchored, originFor, type AnchoredParams } from "./anchored.js";
	import type { Side, Align } from "../anchor-position.js";

	interface Props {
		open: boolean;
		side?: Side;
		align?: Align;
		params?: AnchoredParams;
	}

	let { open, side = "bottom", align = "center", params }: Props = $props();
</script>

{#if open}
	<div
		data-testid="node"
		transition:anchored={params}
		data-side={side}
		style:transform-origin={originFor(side, align)}
	>
		content
	</div>
{/if}
