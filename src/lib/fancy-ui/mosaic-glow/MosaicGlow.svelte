<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { MosaicGlowIdle } from "./mosaic-glow-core.js";

	export type { MosaicGlowIdle };

	/**
	 * MosaicGlow — a cursor-lit canvas mosaic.
	 *
	 * A dark surface tiled with small squares. A soft halo follows the pointer
	 * with a slight lag and lights the tiles under it to random intensities;
	 * lit tiles fade slowly so the pointer leaves a comet trail. An additive
	 * bloom bleeds over the gaps, a glassy highlight sits on every tile, and a
	 * scattering of faint tiles stays visible outside the halo. With nobody
	 * pointing, the halo drifts on its own.
	 *
	 * The canvas loop itself lives in `mosaic-glow-core.ts`; this file owns the
	 * markup, the reduced-motion query and the two observers.
	 */
	interface BaseProps {
		/** Additional classes on the host */
		class?: string;
		/** Content rendered above the canvas — give the host a height */
		children?: Snippet;
		/** Bindable host element */
		ref?: HTMLDivElement | null;
		/** Tile edge in CSS px */
		tileSize?: number;
		/** Gap between tiles in CSS px */
		gap?: number;
		/** Halo / tile colour — hex or rgb() */
		color?: string;
		/** Surface colour behind the tiles — hex or rgb() */
		background?: string;
		/** Halo radius in CSS px */
		radius?: number;
		/** Overall brightness of lit tiles, 0–1 */
		intensity?: number;
		/** How long lit tiles linger after the halo moves on, 0–1 */
		trail?: number;
		/** Pointer lag, 0 (instant) to 1 (very laggy) */
		smoothing?: number;
		/** Spread of per-tile random brightness inside the halo, 0–1 */
		noise?: number;
		/** Visibility of the random faint tiles outside the halo, 0–1 */
		ambient?: number;
		/** Slowly re-roll the faint tiles over time */
		flicker?: boolean;
		/** What the halo does with no pointer: wander on its own or switch off */
		idle?: MosaicGlowIdle;
		/** Follow the pointer. Off leaves only the idle behaviour. */
		interactive?: boolean;
		/** Seed for the per-tile randomness — same seed, same mosaic */
		seed?: number;
	}

	export type MosaicGlowProps = BaseProps & Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>;
</script>

<script lang="ts">
	import { onMount, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import {
		clamp01,
		createMosaicGlow,
		normalizeGap,
		normalizeRadius,
		normalizeTileSize,
		type MosaicGlowEngine,
	} from "./mosaic-glow-core.js";

	let {
		class: className,
		children,
		ref = $bindable(null),
		tileSize = 18,
		gap = 2,
		color = "#f2c318",
		background = "#0a0a0a",
		radius = 170,
		intensity = 1,
		trail = 0.6,
		smoothing = 0.15,
		noise = 0.7,
		ambient = 0.35,
		flicker = true,
		idle = "drift",
		interactive = true,
		seed = 1,
		...restProps
	}: MosaicGlowProps = $props();

	// Clamped here as well as inside the engine: the effects below depend on the
	// clamped values, so a prop that moves but clamps to the same number never
	// rebuilds the grid or repaints.
	const intensityC = $derived(clamp01(intensity));
	const trailC = $derived(clamp01(trail));
	const smoothingC = $derived(clamp01(smoothing));
	const noiseC = $derived(clamp01(noise));
	const ambientC = $derived(clamp01(ambient));
	const radiusC = $derived(normalizeRadius(radius));
	const tileC = $derived(normalizeTileSize(tileSize));
	const gapC = $derived(normalizeGap(gap));

	let reducedMotion = $state(false);
	let canvasEl: HTMLCanvasElement | null = $state(null);
	/** Plain closure state on purpose: nothing rendered depends on the engine. */
	let engine: MosaicGlowEngine | null = null;

	// --- mount: engine, reduced motion, observers --------------------------------

	onMount(() => {
		const host = ref;
		const canvas = canvasEl;
		if (!host || !canvas) return;

		let mq: MediaQueryList | undefined;
		if (typeof window.matchMedia === "function") {
			mq = window.matchMedia("(prefers-reduced-motion: reduce)");
			reducedMotion = mq.matches;
		}

		engine = createMosaicGlow(
			{ host, canvas },
			{
				tileSize: tileC,
				gap: gapC,
				color,
				background,
				radius: radiusC,
				intensity: intensityC,
				trail: trailC,
				smoothing: smoothingC,
				noise: noiseC,
				ambient: ambientC,
				flicker,
				idle,
				interactive,
				seed,
				reducedMotion,
			}
		);
		if (!engine) return;

		const onMq = (e: MediaQueryListEvent) => {
			reducedMotion = e.matches;
		};
		mq?.addEventListener("change", onMq);

		let ro: ResizeObserver | undefined;
		if (typeof ResizeObserver !== "undefined") {
			// The engine ignores a resize that moved neither the box nor the pixel ratio.
			ro = new ResizeObserver(() => engine?.resize());
			ro.observe(host);
		}

		let io: IntersectionObserver | undefined;
		if (typeof IntersectionObserver !== "undefined") {
			io = new IntersectionObserver(
				([entry]) => {
					if (entry) engine?.setOptions({ visible: entry.isIntersecting });
				},
				{ rootMargin: "128px" }
			);
			io.observe(host);
		}

		return () => {
			engine?.destroy();
			engine = null;
			ro?.disconnect();
			io?.disconnect();
			mq?.removeEventListener("change", onMq);
		};
	});

	// --- live props: one effect per concern, each untracking its own push ---------

	// Structural props rebuild the grid (heat resets — acceptable, it is structural).
	// The first run only records dependencies; onMount does the initial setup.
	let structuralInit = false;
	$effect(() => {
		const next = { tileSize: tileC, gap: gapC, seed, noise: noiseC, ambient: ambientC };
		if (!structuralInit) {
			structuralInit = true;
			return;
		}
		untrack(() => engine?.setOptions(next));
	});

	$effect(() => {
		const next = { color, background };
		untrack(() => engine?.setOptions(next));
	});

	// Loop- and paint-affecting props: restart a stopped loop, repaint a static frame.
	let visualInit = false;
	$effect(() => {
		const next = { idle, flicker, radius: radiusC, intensity: intensityC };
		if (!visualInit) {
			visualInit = true;
			return;
		}
		untrack(() => engine?.setOptions(next));
	});

	// Read by the next frame; nothing to schedule or repaint.
	$effect(() => {
		const next = { trail: trailC, smoothing: smoothingC };
		untrack(() => engine?.setOptions(next));
	});

	$effect(() => {
		const rm = reducedMotion;
		untrack(() => engine?.setOptions({ reducedMotion: rm }));
	});

	$effect(() => {
		const on = interactive;
		untrack(() => engine?.setOptions({ interactive: on }));
	});
</script>

<div
	bind:this={ref}
	class={cn("mosaic-glow relative overflow-hidden", className)}
	style:background-color={background}
	{...restProps}
>
	<canvas
		bind:this={canvasEl}
		class="pointer-events-none absolute inset-0 block h-full w-full"
		aria-hidden="true"
	></canvas>
	{#if children}
		<div class="mosaic-glow__content relative z-[1] h-full w-full">
			{@render children()}
		</div>
	{/if}
</div>
