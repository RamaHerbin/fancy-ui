<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";

	let { values }: { values: PlaygroundValues } = $props();

	// FluidCursor reads its simulation props once, at mount. Remount on a knob
	// change, debounced so dragging a slider does not rebuild the GL context
	// on every tick.
	const knobKey = $derived(`${values.splatRadius}|${values.curl}|${values.colorIntensity}`);
	let mountedKey = $state("");
	$effect(() => {
		const next = knobKey;
		if (!mountedKey) {
			mountedKey = next;
			return;
		}
		const timer = setTimeout(() => (mountedKey = next), 250);
		return () => clearTimeout(timer);
	});
</script>

<div class="finds-fluid relative h-full w-full overflow-hidden">
	{#key mountedKey}
		<FluidCursor
			contained
			transparent
			pauseWhenHidden
			class="absolute inset-0"
			splatRadius={values.splatRadius as number}
			curl={values.curl as number}
			colorIntensity={values.colorIntensity as number}
		/>
	{/key}
	<span
		class="finds-caption pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[10.5px] tracking-[0.2em] text-white/45"
		aria-hidden="true">MOVE TO STIR</span
	>
</div>

<style>
	.finds-caption {
		transition: opacity 400ms ease;
	}
	.finds-fluid:hover .finds-caption {
		opacity: 0;
	}
</style>
