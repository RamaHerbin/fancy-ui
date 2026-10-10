<script lang="ts" module>
	export interface LiquidTextProps {
		/** Text rendered into the fluid texture (or as static fallback text). */
		text?: string;
		/** CSS font-family. Empty string resolves to getComputedStyle(host).fontFamily. */
		font?: string;
		/** Font size in px. 0 auto-fits the text to the container's width. */
		fontSize?: number;
		/** CSS font-weight for the rasterized/fallback text. */
		fontWeight?: number | string;
		/** Text color used in light mode. */
		lightColor?: string;
		/** Text color used in dark mode. */
		darkColor?: string;
		/** Additional CSS classes applied to the root element. */
		class?: string;
		/** Geometric UV warp gain — how far the fluid velocity displaces the text's UVs. */
		strength?: number;
		/** Splat radius in screen pixels around the pointer. */
		radius?: number;
		/** Multiplier from mouse-delta-per-frame to splat force. */
		forceGain?: number;
		/** Per-frame velocity decay factor (relax-back rate for the smear). */
		dissipation?: number;
		/** Viscous diffusion strength (Jacobi iteration, 8 iters). */
		viscosity?: number;
		/** Chromatic offset = warp amount x this ratio. */
		chromaticRatio?: number;
		/** If window.innerWidth <= staticBelow at mount, render static DOM text instead. */
		staticBelow?: number;
		/** Whether the fluid sim reacts to pointer movement. */
		interactive?: boolean;
		/** Pause the render loop via visibilitychange when the tab/page is hidden. */
		pauseWhenHidden?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount, untrack } from "svelte";
	import {
		createLiquidText,
		measureLiquidText,
		DEFAULT_DISPLAY_FONT_SIZE,
		HEIGHT_RATIO,
		type LiquidTextEngine,
	} from "./liquid-text-core.js";

	let {
		text = "Liquid",
		font = "",
		fontSize = 0,
		fontWeight = 700,
		lightColor = "#000000",
		darkColor = "#ffffff",
		class: className = "",
		strength = 0.5,
		radius = 160,
		forceGain = 17,
		dissipation = 0.98,
		viscosity = 4,
		chromaticRatio = 0.2,
		staticBelow = 1024,
		interactive = true,
		pauseWhenHidden = true,
	}: LiquidTextProps = $props();

	let rootEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();

	// Always starts "static" so the very first render (SSR or client) never
	// touches window/document — onMount promotes to "canvas" if eligible.
	let mode: "static" | "canvas" = $state("static");
	let themeColor = $state(lightColor);
	let resolvedFont = $state(font);
	let displayFontSize = $state(fontSize > 0 ? fontSize : DEFAULT_DISPLAY_FONT_SIZE);

	// Deliberately NOT $state: the effects below read them without taking a
	// dependency, so booting the engine in onMount never re-runs them.
	// `simRunning` goes false when the sim is dropped mid-session (reduced
	// motion flipped on, GPU context lost) while `engine` is kept until
	// unmount so destroy() can still release the canvas listeners/context.
	let engine: LiquidTextEngine | null = null;
	let simRunning = false;

	const rootHeight = $derived(`${Math.round(displayFontSize * HEIGHT_RATIO)}px`);

	function activeThemeColor(): string {
		return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
			? darkColor
			: lightColor;
	}

	/** Static-fallback metrics. While the sim runs, the engine measures instead
	 * and reports back through `onMetrics`. */
	function fitFontSize() {
		if (!rootEl) return;
		const metrics = measureLiquidText(rootEl, { text, font, fontSize, fontWeight });
		resolvedFont = metrics.font;
		if (metrics.fontSize !== null) displayFontSize = metrics.fontSize;
	}

	function simOptions() {
		return {
			strength,
			radius,
			forceGain,
			dissipation,
			viscosity,
			chromaticRatio,
			interactive,
			pauseWhenHidden,
		};
	}

	// Text/font/color changes re-derive the resolved font + size and, on the
	// canvas path, re-rasterize the text texture.
	$effect(() => {
		void [text, font, fontSize, fontWeight, lightColor, darkColor];
		untrack(() => {
			if (!rootEl) return;
			themeColor = activeThemeColor();
			if (simRunning && engine) {
				engine.setOptions({ text, font, fontSize, fontWeight, textColor: themeColor });
			} else {
				fitFontSize();
			}
		});
	});

	// Sim parameters: pushed through without touching the text texture.
	$effect(() => {
		void [strength, radius, forceGain, dissipation, viscosity, chromaticRatio];
		void [interactive, pauseWhenHidden];
		untrack(() => {
			engine?.setOptions(simOptions());
		});
	});

	onMount(() => {
		const root = rootEl;
		const canvas = canvasEl;
		if (!root || !canvas) return;

		themeColor = activeThemeColor();

		const themeObserver = new MutationObserver(() => {
			const next = activeThemeColor();
			if (next !== themeColor) {
				themeColor = next;
				engine?.setOptions({ textColor: next });
			}
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		fitFontSize();

		const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const tooSmall = window.innerWidth <= staticBelow;

		if (!reduceMotionQuery.matches && !tooSmall) {
			engine = createLiquidText(
				{ host: root, canvas },
				{
					text,
					font,
					fontSize,
					fontWeight,
					textColor: themeColor,
					...simOptions(),
					onMetrics: (metrics) => {
						resolvedFont = metrics.font;
						displayFontSize = metrics.fontSize;
					},
					// A real GPU context loss leaves every GL object invalid, so
					// the engine tears itself down and we drop to the stable
					// static fallback for the rest of this mount.
					onContextLost: () => {
						simRunning = false;
						mode = "static";
					},
				}
			);
			if (engine) {
				simRunning = true;
				mode = "canvas";
			}
		}

		// One observer for both paths: it drives the sim's resize while the
		// canvas is live, and the auto-fit (fontSize=0) fallback text
		// otherwise — so the fallback never stays frozen at its mount-time
		// size across a later container/viewport resize (e.g. mobile rotation).
		const resizeObserver = new ResizeObserver(() => {
			if (simRunning && engine) engine.resize();
			else fitFontSize();
		});
		resizeObserver.observe(root);

		// Honor a live toggle of the OS reduced-motion setting, not just its
		// value at mount: if it flips to "reduce" while the sim is running,
		// tear the sim down and drop to the static fallback.
		function onReduceMotionChange(e: MediaQueryListEvent) {
			if (e.matches && simRunning) {
				engine?.destroy();
				engine = null;
				simRunning = false;
				mode = "static";
			}
		}
		reduceMotionQuery.addEventListener("change", onReduceMotionChange);

		return () => {
			themeObserver.disconnect();
			reduceMotionQuery.removeEventListener("change", onReduceMotionChange);
			resizeObserver.disconnect();
			engine?.destroy();
			engine = null;
			simRunning = false;
		};
	});
</script>

<div
	bind:this={rootEl}
	class={cn("liquid-text relative block w-full", className)}
	style:height={rootHeight}
>
	<canvas
		bind:this={canvasEl}
		aria-hidden="true"
		class={cn(
			"pointer-events-none absolute inset-0 block h-full w-full",
			mode === "canvas" ? "" : "invisible"
		)}
	></canvas>
	{#if mode === "canvas"}
		<span class="sr-only">{text}</span>
	{:else}
		<span
			class="liquid-text-fallback block"
			style:color={themeColor}
			style:font-family={resolvedFont}
			style:font-size={`${displayFontSize}px`}
			style:font-weight={fontWeight}>{text}</span
		>
	{/if}
</div>

<style>
	.liquid-text {
		line-height: 1;
	}

	.liquid-text-fallback {
		margin: 0;
		white-space: nowrap;
	}
</style>
