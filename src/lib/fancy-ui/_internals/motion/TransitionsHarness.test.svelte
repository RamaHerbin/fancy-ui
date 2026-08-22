<!--
  Test-only rig: mounts a `{#if open}` block whose element carries a
  `preset()` transition, so a test can toggle `open` via rerender() and
  prove the transition actually drives the node through a real mount/unmount
  cycle — either through the `Element.prototype.animate` stub in
  `src/test-setup.ts` (non-zero duration), or through Svelte's own
  duration-falsy short-circuit (duration: 0, synchronous, animate() never
  called). Not exported from index.ts, and not collected by Vitest directly
  (the run includes `*.test.ts` only) — imported and rendered from
  transitions.test.ts.
-->
<script lang="ts">
	import { preset, type PresetParams } from "./transitions.js";
	import type { PresetName } from "./presets.js";

	interface Props {
		open: boolean;
		name: PresetName;
		params?: PresetParams;
	}

	let { open, name, params }: Props = $props();
	// $derived.by, not a plain `const`, because `name` is a reactive prop —
	// no test currently changes it mid-lifetime, but a bare
	// `const fn = preset(name)` would silently freeze on whatever `name` was
	// at first render if one ever did.
	const fn = $derived.by(() => preset(name));
</script>

{#if open}
	<div data-testid="node" transition:fn={params}>content</div>
{/if}
