<script lang="ts" module>
	export interface OpticalDiscProps {
		/** Image printed on the label side. Omit for the built-in blank label. */
		label?: string;
		/** Accessible name. Without it the disc is decorative and hidden from assistive tech. */
		alt?: string;
		/** Seconds per full turn. 0 keeps the disc still; negative turns the other way. */
		spin?: number;
		/** Starting angle in degrees. 0 faces the label to the viewer, 180 the mirror. */
		angle?: number;
		/** Lean of the spin axis toward the viewer, in degrees. */
		tilt?: number;
		/** Strength of the diffraction colours. 0 leaves a plain mirror. */
		iridescence?: number;
		/** Track pitch in nanometres. Smaller spreads the colours wider. */
		pitch?: number;
		/** Label paper colour, `#rgb` or `#rrggbb`. */
		labelColor?: string;
		/** Tint of the clear hub, `#rgb` or `#rrggbb`. */
		tint?: string;
		/** Drag to turn the disc. */
		interactive?: boolean;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";
	import {
		createOpticalDisc,
		fallbackBackground,
		OPTICAL_DISC_DEFAULTS,
		type OpticalDiscEngine,
	} from "./optical-disc-core.js";

	let {
		label,
		alt,
		spin = OPTICAL_DISC_DEFAULTS.spin,
		angle = OPTICAL_DISC_DEFAULTS.angle,
		tilt = OPTICAL_DISC_DEFAULTS.tilt,
		iridescence = OPTICAL_DISC_DEFAULTS.iridescence,
		pitch = OPTICAL_DISC_DEFAULTS.pitch,
		labelColor = OPTICAL_DISC_DEFAULTS.labelColor,
		tint = OPTICAL_DISC_DEFAULTS.tint,
		interactive = true,
		class: className = "",
	}: OpticalDiscProps = $props();

	let canvas: HTMLCanvasElement;
	let engine: OpticalDiscEngine | null = $state.raw(null);

	// Started before the engine effect so the very first frame already knows.
	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	// One engine per mount: every prop is live except the starting angle, which
	// only means something at creation, so nothing here is tracked.
	$effect(() => {
		if (!canvas) return;
		const instance = untrack(() =>
			createOpticalDisc(
				{ canvas },
				{
					angle,
					label: label ?? null,
					spin,
					tilt,
					iridescence,
					pitch,
					labelColor,
					tint,
					interactive,
					reducedMotion: reduced.current,
				}
			)
		);
		if (!instance) return;
		engine = instance;
		return () => {
			engine = null;
			instance.destroy();
		};
	});

	$effect(() => {
		engine?.setOptions({
			label: label ?? null,
			spin,
			tilt,
			iridescence,
			pitch,
			labelColor,
			tint,
			interactive,
			reducedMotion: reduced.current,
		});
	});
</script>

<div
	class={cn("fancy-optical-disc relative aspect-square w-full", className)}
	role={alt ? "img" : undefined}
	aria-label={alt}
	aria-hidden={alt ? undefined : "true"}
	data-ready={engine ? "" : undefined}
>
	<!-- Shown on the server, before the first frame, and when WebGL is unavailable. -->
	{#if !engine}
		<div
			class="fancy-optical-disc-fallback absolute inset-[12%] rounded-full"
			style:background={fallbackBackground(labelColor)}
		></div>
	{/if}
	<canvas
		bind:this={canvas}
		class="absolute inset-0 block h-full w-full"
		style:touch-action={interactive ? "pan-y" : undefined}
		style:cursor={interactive ? "grab" : undefined}
	></canvas>
</div>
