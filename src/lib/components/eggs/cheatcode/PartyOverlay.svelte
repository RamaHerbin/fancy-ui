<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import confetti from "canvas-confetti";
	import type { EggContext } from "../types.js";
	import { playJingle } from "./jingle.js";

	let { ctx }: { ctx: EggContext } = $props();

	/** Site palette: violet, blue, ivory, pink. */
	const COLORS = ["#a78bfa", "#5b8cff", "#f5f1e8", "#f0abfc"];
	/** Stop emitting before the runtime's 8 s auto-dismiss so the last pieces can land. */
	const EMIT_MS = 6000;
	const STREAM_EVERY_MS = 250;

	let canvas = $state<HTMLCanvasElement>();
	let fire: confetti.CreateTypes | undefined;
	let stream: ReturnType<typeof setInterval> | undefined;
	let stopTimer: ReturnType<typeof setTimeout> | undefined;
	let cancelJingle: (() => void) | undefined;
	let destroyed = false;

	function stopStream() {
		if (stream !== undefined) clearInterval(stream);
		stream = undefined;
	}

	onMount(() => {
		void playJingle()
			.then((cancel) => {
				if (destroyed) cancel();
				else cancelJingle = cancel;
			})
			.catch(() => {
				// Sound is a bonus: a failed chunk must not break the party.
			});

		if (ctx.reducedMotion || !canvas) return;
		fire = confetti.create(canvas, { resize: true, useWorker: false });

		// Opening double burst from both bottom corners, aimed inwards.
		const burst = { particleCount: 70, spread: 60, startVelocity: 55, ticks: 220, colors: COLORS };
		void fire({ ...burst, angle: 60, origin: { x: 0, y: 1 } });
		void fire({ ...burst, angle: 120, origin: { x: 1, y: 1 } });

		// Then a gentle stream: a few slow pieces at a time, alternating sides.
		let side = 0;
		stream = setInterval(() => {
			side ^= 1;
			void fire?.({
				particleCount: 4,
				spread: 70,
				startVelocity: 25,
				ticks: 120,
				gravity: 0.8,
				angle: side ? 60 : 120,
				origin: { x: side ? 0.1 : 0.9, y: 0.95 },
				colors: COLORS,
			});
		}, STREAM_EVERY_MS);
		stopTimer = setTimeout(stopStream, EMIT_MS);
	});

	onDestroy(() => {
		destroyed = true;
		stopStream();
		if (stopTimer !== undefined) clearTimeout(stopTimer);
		cancelJingle?.();
		fire?.reset();
	});
</script>

{#if !ctx.reducedMotion}
	<canvas bind:this={canvas} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
{/if}
<p
	aria-hidden="true"
	class="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-sm whitespace-nowrap text-white/90 backdrop-blur"
>
	✦ Party mode — Esc to stop, or it ends on its own
</p>
