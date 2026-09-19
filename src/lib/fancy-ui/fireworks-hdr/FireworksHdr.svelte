<script lang="ts" module>
	import type { FireworksHandle, ShellKind } from "./fireworks-shared.js";

	/** Props for {@link FireworksHdr}. */
	export interface FireworksHdrProps {
		/**
		 * Brand hues (hex). Order is irrelevant — they are parsed and sorted into
		 * the canonical cool→warm ping-pong order (cyan, blue, violet, magenta)
		 * so the shell sweep is stable however they are listed.
		 */
		palette?: string[];
		/**
		 * Opt into the GPU engine: WebGPU HDR first, then a WebGL2 fallback
		 * (display-p3 SDR where supported, else plain sRGB). When false, no engine
		 * boots at all.
		 */
		hdr?: boolean;
		/** Display exposure multiplier, clamped [1,4]. */
		exposure?: number;
		/** Run the ambient auto-scheduler. */
		ambient?: boolean;
		/** Ambient intensity [0,1] — scales shell size/energy. */
		ambientIntensity?: number;
		/** Launch a shell toward the pointer on window pointerdown. */
		interactive?: boolean;
		/** Quality tier, or "auto" to pick from the render level + DPR. */
		quality?: "auto" | "high" | "mid" | "low";
		/**
		 * Which shells the ambient scheduler is allowed to fire, picked uniformly.
		 * Defaults to the weighted peony/willow/ring mix. Pattern shells ("heart",
		 * "star") are valid here; "glyph" and "shape" are not — they need points
		 * the scheduler has no way to invent, so they are ignored if listed.
		 */
		ambientShells?: ShellKind[];
		/** Force ambient off under prefers-reduced-motion (launches still work). */
		respectReducedMotion?: boolean;
		/** Extra classes on the canvas wrapper. */
		class?: string;
		/**
		 * Called when the engine is live, with an imperative handle. Never called
		 * when no GPU renderer comes up (the caller uses its own timeout). Called
		 * again after a GPU context loss is recovered, with a fresh handle whose
		 * `renderLevel` reflects the engine that came back (a lost WebGPU device
		 * can return as the WebGL2 fallback).
		 */
		onReady?: (handle: FireworksHandle) => void;
		/**
		 * Called once when the GPU context is lost and cannot be brought back.
		 * The component has torn itself down by then: the loop is stopped, the
		 * listeners are gone, and any handle it handed out is inert. Use it to
		 * swap in a static fallback.
		 */
		onLost?: () => void;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";
	import { EXPOSURE_AMBIENT } from "./fireworks-shared.js";
	import { createFireworksHdr, type FireworksHdrEngine } from "./fireworks-hdr-core.js";

	let {
		palette = ["#ff2fd6", "#a142ff", "#3d5bff", "#42cfff"],
		hdr = true,
		exposure = EXPOSURE_AMBIENT,
		ambient = true,
		ambientIntensity = 0.35,
		interactive = true,
		quality = "auto",
		ambientShells,
		respectReducedMotion = true,
		class: className = "",
		onReady,
		onLost,
	}: FireworksHdrProps = $props();

	let canvasRef: HTMLCanvasElement;

	onMount(() => {
		const canvas = canvasRef;
		if (!canvas) return;

		// The wrapper owns the media query; the engine only sees the answer.
		const prefersReduced =
			respectReducedMotion &&
			typeof window !== "undefined" &&
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		// Every prop above is a mount-time snapshot (this component has never had
		// an `$effect`): runtime control goes through the `onReady` handle, which
		// drives the engine's live options from the inside.
		const engine: FireworksHdrEngine | null = createFireworksHdr(
			{ canvas },
			{
				palette,
				hdr,
				exposure,
				ambient,
				ambientIntensity,
				interactive,
				quality,
				ambientShells,
				reducedMotion: prefersReduced,
				debug: import.meta.env.DEV,
				onReady,
				onLost,
			}
		);

		// Visibility gating + resize stay wrapper-side, forwarded to the engine.
		const observer = new IntersectionObserver(
			([entry]) => {
				engine?.setOptions({ visible: entry.isIntersecting });
			},
			{ threshold: 0 }
		);
		observer.observe(canvas);

		const resizeObs = new ResizeObserver(() => {
			engine?.resize();
		});
		resizeObs.observe(canvas);

		return () => {
			observer.disconnect();
			resizeObs.disconnect();
			engine?.destroy();
		};
	});
</script>

<div class={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
	<canvas bind:this={canvasRef} class="block h-full w-full"></canvas>
</div>
