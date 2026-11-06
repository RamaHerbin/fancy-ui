<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { FireworksHdr, type FireworksHandle, type ShellKind } from "$lib/fancy-ui/fireworks-hdr";

	let { values }: { values: PlaygroundValues } = $props();

	const SHELLS: Record<string, ShellKind[] | undefined> = {
		mix: undefined,
		heart: ["peony", "heart"],
		star: ["ring", "star"],
	};

	// FireworksHdr reads its props once, at mount; runtime control goes through
	// the handle. Remount on a knob change, debounced so dragging a slider does
	// not rebuild the GPU context on every tick.
	const knobKey = $derived(`${values.shells}|${values.ambientIntensity}|${values.exposure}`);
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

	let handle: FireworksHandle | null = null;
	let root: HTMLDivElement;

	// The component's own `interactive` listens on the whole window; the demo
	// launches only for presses inside its stage.
	function launchAt(event: PointerEvent) {
		if (!handle) return;
		const box = root.getBoundingClientRect();
		const x = Math.min(0.92, Math.max(0.08, (event.clientX - box.left) / box.width));
		const y = Math.min(0.7, Math.max(0.12, (event.clientY - box.top) / box.height));
		handle.launch({ apex: { x, y } });
	}

	function ready(next: FireworksHandle) {
		handle = next;
		// Open on a pair of shells instead of an empty sky.
		next.launch({ apex: { x: 0.32, y: 0.32 }, shell: "peony" });
		setTimeout(() => handle?.launch({ apex: { x: 0.68, y: 0.26 }, shell: "willow" }), 260);
	}
</script>

<div
	bind:this={root}
	class="finds-fireworks relative h-full w-full cursor-crosshair overflow-hidden bg-black"
	role="presentation"
	onpointerdown={launchAt}
	data-capture="click"
	data-capture-wait="900"
>
	{#key mountedKey}
		<FireworksHdr
			interactive={false}
			ambientShells={SHELLS[values.shells as string]}
			ambientIntensity={values.ambientIntensity as number}
			exposure={values.exposure as number}
			onReady={ready}
			onLost={() => (handle = null)}
		/>
	{/key}
	<span
		class="finds-caption pointer-events-none absolute inset-x-0 bottom-4 text-center font-mono text-[10.5px] tracking-[0.2em] text-white/45"
		aria-hidden="true">TAP THE SKY</span
	>
</div>

<style>
	.finds-caption {
		transition: opacity 400ms ease;
	}
	.finds-fireworks:hover .finds-caption {
		opacity: 0;
	}
</style>
