<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { PixelSceneName } from "./pixel-scene-scenes.js";

	export type { PixelSceneName };

	/**
	 * PixelScene — an animated pixel-art landscape on a dot grid.
	 *
	 * At rest only sparse ink dots and the lit cells show; a round lens that
	 * follows the pointer reveals the picture in full colour, with a dithered
	 * rim. Day and night are two complete palettes. On HDR displays the lit
	 * cells (sun, moon, windows, stars, fireflies, the lens field) are redrawn
	 * as hard squares brighter than SDR white in a WebGPU layer.
	 *
	 * The engine, the scenes and the HDR layer live in three framework-free
	 * cores; this file owns the markup and pushes props into the engine.
	 */
	interface BaseProps {
		/** Which landscape to paint */
		scene?: PixelSceneName;
		/** Night palette (stars, moon, lit windows) instead of day. Never changed by the component. */
		night?: boolean;
		/** Grid pitch in CSS px (clamped 4–32; grows on very large boxes) */
		cell?: number;
		/** Square dot edge in CSS px, at most `cell` */
		dot?: number;
		/** Show full colour under a round lens that follows the pointer */
		lens?: boolean;
		/** Lens radius in cells */
		lensRadius?: number;
		/** On HDR displays, draw lit cells brighter than SDR white in a WebGPU layer */
		hdr?: boolean;
		/** Colour of the resting dots; any CSS colour, `currentColor` resolved on the host */
		ink?: string;
		/** Freeze the scene's animations (the lens still follows the pointer) */
		paused?: boolean;
		/** Animate a change of `night` as a dithered wave from the sun (never under reduced motion) */
		wave?: boolean;
		/** `[day, night]` background painted by the scene itself; the wave carries it. Default: transparent */
		surfaces?: readonly [day: string, night: string];
		/** `[day, night]` dot colours, swapped by the wave; overrides `ink` */
		inks?: readonly [day: string, night: string];
		/** Additional classes on the host — give it a height */
		class?: string;
		/** Copy rendered above the picture */
		children?: Snippet;
		/** Bindable host element */
		ref?: HTMLDivElement | null;
	}

	export type PixelSceneProps = BaseProps & Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createPixelScene, type PixelSceneEngine } from "./pixel-scene-core.js";
	import { getScenePainter } from "./pixel-scene-scenes.js";
	import {
		PIXEL_SCENE_HDR_RESTART_MS,
		PIXEL_SCENE_HDR_RESTARTS,
		pixelSceneHdrAvailable,
		startPixelSceneHdr,
	} from "./pixel-scene-hdr.js";

	let {
		scene = "alpine",
		night = false,
		cell = 5,
		dot = 4,
		lens = true,
		lensRadius = 21,
		hdr = true,
		ink = "currentColor",
		paused = false,
		wave = true,
		surfaces,
		inks,
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: PixelSceneProps = $props();

	let canvasEl: HTMLCanvasElement | null = $state(null);
	let hdrCanvas: HTMLCanvasElement | null = $state(null);
	/** False on the server and the first client render: the HDR canvas appears only after mount. */
	let mounted = $state(false);
	let hdrCapable = $state(false);
	let hdrOn = $state(false);
	/** Bumped to start the HDR layer again after a device loss; the effect below reads it. */
	let hdrRun = $state(0);
	let hdrRestarts = 0;
	let engineReady = $state(false);
	/** Plain closure state on purpose: nothing rendered depends on the engine. */
	let engine: PixelSceneEngine | null = null;

	onMount(() => {
		mounted = true;
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas) return;
		engine = untrack(() =>
			createPixelScene(
				{ host, canvas },
				{
					painter: getScenePainter(scene),
					night,
					cell,
					dot,
					lens,
					lensRadius,
					ink,
					paused,
					wave,
					surfaces: surfaces ?? null,
					inks: inks ?? null,
				}
			)
		);
		engineReady = engine !== null;
		return () => {
			engine?.destroy();
			engine = null;
			engineReady = false;
			mounted = false;
		};
	});

	// --- live props: each effect pushes its own keys; the engine ignores absent ones

	$effect(() => {
		const next = { painter: getScenePainter(scene), night };
		untrack(() => engine?.setOptions(next));
	});

	$effect(() => {
		const next = { cell, dot };
		untrack(() => engine?.setOptions(next));
	});

	$effect(() => {
		const next = {
			lens,
			lensRadius,
			ink,
			paused,
			wave,
			surfaces: surfaces ?? null,
			inks: inks ?? null,
		};
		untrack(() => engine?.setOptions(next));
	});

	// HDR: decided after mount only, so SSR and hydration render the 2D canvas alone.
	$effect(() => {
		hdrCapable = mounted && hdr && pixelSceneHdrAvailable();
	});

	$effect(() => {
		const canvas = hdrCanvas;
		void hdrRun;
		if (!canvas || !engineReady || !hdrCapable) return;
		let cancelled = false;
		let stop: (() => void) | null = null;
		let retry: ReturnType<typeof setTimeout> | null = null;
		// A lost device usually comes back (GPU process restarted, driver reset):
		// start again after a growing pause, a few times, before giving the layer up.
		const restart = () => {
			if (hdrRestarts >= PIXEL_SCENE_HDR_RESTARTS) {
				hdrCapable = false;
				return;
			}
			hdrRestarts++;
			retry = setTimeout(() => {
				retry = null;
				hdrRun++;
			}, PIXEL_SCENE_HDR_RESTART_MS * hdrRestarts);
		};
		void startPixelSceneHdr(canvas).then((layer) => {
			if (cancelled || !engine) {
				layer?.destroy();
				return;
			}
			if (!layer) {
				// Nothing to start on the first try (no adapter, tone mapping refused): give
				// up at once. During a restart the GPU may still be on its way back.
				if (hdrRestarts === 0) hdrCapable = false;
				else restart();
				return;
			}
			const target = engine;
			target.setOptions({ onFrame: (frame) => layer.render(frame) });
			hdrOn = true;
			stop = () => {
				target.setOptions({ onFrame: null });
				layer.destroy();
				hdrOn = false;
			};
			void layer.lost.then(() => {
				if (cancelled) return;
				stop?.();
				stop = null;
				restart();
			});
		});
		return () => {
			cancelled = true;
			stop?.();
			stop = null;
			if (retry !== null) clearTimeout(retry);
		};
	});
</script>

<div
	bind:this={ref}
	class={cn("pixel-scene relative overflow-hidden", className)}
	data-scene={scene}
	data-night={night ? "" : undefined}
	data-hdr={hdrOn ? "" : undefined}
	{...restProps}
>
	<canvas
		bind:this={canvasEl}
		class="pointer-events-none absolute inset-0 block h-full w-full"
		aria-hidden="true"
	></canvas>
	{#if hdrCapable}
		<!-- Lit cells above SDR white, over the 2D picture, on HDR displays only. -->
		<canvas
			bind:this={hdrCanvas}
			class="pixel-scene__hdr pointer-events-none absolute inset-0 block h-full w-full"
			aria-hidden="true"
		></canvas>
	{/if}
	{#if children}
		<div class="pixel-scene__content relative z-[1] h-full w-full">
			{@render children()}
		</div>
	{/if}
</div>
