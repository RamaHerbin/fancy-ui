<script lang="ts">
	import { onMount } from "svelte";
	import { MatrixRain } from "$lib/fancy-ui/matrix-rain/index.js";
	import type { EggContext } from "../types.js";

	let { ctx }: { ctx: EggContext } = $props();

	let leave: HTMLButtonElement | undefined = $state();
	let root: HTMLDivElement | undefined = $state();
	// One fade-in from transparent, then steady: no keyframe loop, nothing that can strobe.
	let shown = $state(false);

	onMount(() => {
		const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// Keyboard users get a way out that does not depend on knowing Escape.
		leave?.focus({ preventScroll: true });
		const raf = requestAnimationFrame(() => (shown = true));
		return () => {
			cancelAnimationFrame(raf);
			// Hand focus back to where the reader was, unless they already moved on.
			const now = document.activeElement;
			if (prev?.isConnected && (now === document.body || (now && root?.contains(now)))) {
				prev.focus({ preventScroll: true });
			}
		};
	});

	// Non-modal on purpose (no trap): focus leaving the overlay leaves the egg,
	// so Tab never lands on page controls hidden behind the opaque panel.
	function onfocusout(e: FocusEvent) {
		if (!(e.relatedTarget instanceof Node && root?.contains(e.relatedTarget))) ctx.dismiss();
	}
</script>

<div
	bind:this={root}
	{onfocusout}
	class="pointer-events-auto absolute inset-0 bg-black transition-opacity duration-300 ease-out"
	style:opacity={shown ? 1 : 0}
	role="dialog"
	aria-modal="false"
	aria-label="Glyph rain"
	data-matrix-overlay
>
	<!-- Backdrop: a click anywhere leaves; Escape is handled by the runtime. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="absolute inset-0" data-matrix-backdrop onclick={() => ctx.dismiss()}>
		{#if !ctx.reducedMotion}
			<MatrixRain color="#00ff41" speed={1} glyphSize={16} />
		{/if}
	</div>

	<div
		class="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 px-4 text-center font-mono text-sm text-[#00ff41]"
	>
		<p class="rounded bg-black/70 px-3 py-1">wake up… — Esc or click to leave</p>
		<button
			bind:this={leave}
			type="button"
			class="pointer-events-auto rounded border border-[#00ff41]/60 bg-black/80 px-4 py-1.5 font-mono text-sm text-[#00ff41] hover:bg-[#00ff41]/10 focus-visible:ring-2 focus-visible:ring-[#00ff41] focus-visible:outline-none"
			onclick={() => ctx.dismiss()}
		>
			Leave
		</button>
	</div>
</div>
