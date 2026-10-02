<script lang="ts">
import type { HTMLAttributes } from "vue";
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
	class?: HTMLAttributes["class"];
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

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watchEffect } from "vue";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import { EXPOSURE_AMBIENT } from "./fireworks-shared.js";
import { createFireworksHdr, type FireworksHdrEngine } from "./fireworks-hdr-core.js";

defineOptions({ name: "FireworksHdr", inheritAttrs: false });

const {
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
} = defineProps<FireworksHdrProps>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");

// `import.meta.env.DEV`, read through a local shape: the package's tsconfig
// does not carry the bundler's ambient `ImportMeta` augmentation, and the
// optional chain also covers a plain-Node import where `env` is absent.
const DEV = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;

// The wrapper owns the media query; the engine only sees the answer. The
// composable starts the query in its own `onMounted`, registered before the
// one below, so the answer is already in by the time the engine is built.
const reducedMotion = useReducedMotion();

let engine: FireworksHdrEngine | null = null;

onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;

	const prefersReduced = respectReducedMotion && reducedMotion.value;

	// Visibility gating + resize stay wrapper-side, forwarded to the engine.
	// Created before the engine: a synchronous `onReady` that calls `cleanup()`
	// tears the engine down inside `createFireworksHdr`, and its `onDestroy`
	// must find these to disconnect.
	const observer = new IntersectionObserver(
		(entries) => {
			const entry = entries[0];
			if (!entry) return;
			engine?.setOptions({ visible: entry.isIntersecting });
		},
		{ threshold: 0 }
	);
	observer.observe(canvas);

	const resizeObs = new ResizeObserver(() => {
		engine?.resize();
	});
	resizeObs.observe(canvas);

	const releaseObservers = () => {
		observer.disconnect();
		resizeObs.disconnect();
	};

	// Palette, exposure, ambient and the rest are mount-time snapshots: runtime
	// control goes through the `onReady` handle. `quality`, `interactive` and
	// the callbacks are pushed live by the watcher below, because the engine
	// reads them after its async boot or a recovery.
	engine = createFireworksHdr(
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
			debug: DEV,
			onReady,
			onLost,
			// Any teardown — unmount, the handle's `cleanup()`, or the give-up
			// after an unrecoverable GPU loss — releases the observers too.
			onDestroy: releaseObservers,
		}
	);

	onBeforeUnmount(() => {
		releaseObservers();
		engine?.destroy();
		engine = null;
	});
});

// Keep what the engine reads after its async boot or a recovery current.
watchEffect(() => {
	const next = { quality, interactive, onReady, onLost };
	engine?.setOptions(next);
});
</script>

<template>
	<div
		:class="cn('pointer-events-none absolute inset-0 h-full w-full', className)"
		aria-hidden="true"
	>
		<canvas ref="canvas" class="block h-full w-full"></canvas>
	</div>
</template>
