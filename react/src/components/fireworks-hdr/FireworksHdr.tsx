import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { REDUCED_MOTION_QUERY } from "../../internals/motion/media-query.js";
import { isDev } from "./dev.js";
import { EXPOSURE_AMBIENT, type FireworksHandle, type ShellKind } from "./fireworks-shared.js";
import { createFireworksHdr, type FireworksHdrEngine } from "./fireworks-hdr-core.js";

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
	/**
	 * Launch a shell toward the pointer on window pointerdown. Read once, when
	 * the engine activates — a later change does not re-wire the listener.
	 */
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
	className?: string;
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

/** The reduced-motion preference as the browser reports it right now. */
function prefersReducedMotionNow(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(REDUCED_MOTION_QUERY).matches
	);
}

export function FireworksHdr({
	palette = ["#ff2fd6", "#a142ff", "#3d5bff", "#42cfff"],
	hdr = true,
	exposure = EXPOSURE_AMBIENT,
	ambient = true,
	ambientIntensity = 0.35,
	interactive = true,
	quality = "auto",
	ambientShells,
	respectReducedMotion = true,
	className = "",
	onReady,
	onLost,
}: FireworksHdrProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<FireworksHdrEngine | null>(null);

	// Every option at its latest committed value, for the engine to read when
	// it starts. None of them is a dependency of the start effect: palette,
	// exposure, ambient and the rest are mount-time snapshots (runtime control
	// goes through the `onReady` handle), exactly as before the extraction.
	const optionsRef = useLiveRef({
		palette,
		hdr,
		exposure,
		ambient,
		ambientIntensity,
		interactive,
		quality,
		ambientShells,
		respectReducedMotion,
	});
	// Identity-stable, so the engine can hold them for its whole life and a
	// recovery long after mount still reaches the consumer's latest callback.
	const handleReady = useEventCallback(onReady);
	const handleLost = useEventCallback(onLost);

	// The boot, the loop, the ambient scheduler, the adaptive downgrade, the
	// pointer listener and the context-loss recovery live in the framework-free
	// engine shared with the Svelte and Vue packages (`fireworks-hdr-core.ts`,
	// a byte-identical copy). Booted once per mount; no prop change re-inits it.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const o = optionsRef.current;

		// The wrapper owns the media query; the engine only sees the answer,
		// snapshotted at mount like every other non-live option.
		const reducedMotion = o.respectReducedMotion && prefersReducedMotionNow();

		let engine: FireworksHdrEngine | null = null;

		// Visibility gating + resize stay wrapper-side, forwarded to the engine.
		// Created before the engine: a synchronous `onReady` that calls
		// `cleanup()` tears the engine down inside `createFireworksHdr`, and its
		// `onDestroy` must find these to disconnect.
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry) engine?.setOptions({ visible: entry.isIntersecting });
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

		// The engine is handed the canvas element itself. Its teardown deletes
		// the GPU resources it allocated but never loses the canvas context, so
		// a StrictMode or Fast Refresh re-run on the same <canvas> boots cleanly.
		engine = createFireworksHdr(
			{ canvas },
			{
				palette: o.palette,
				hdr: o.hdr,
				exposure: o.exposure,
				ambient: o.ambient,
				ambientIntensity: o.ambientIntensity,
				interactive: o.interactive,
				quality: o.quality,
				ambientShells: o.ambientShells,
				reducedMotion,
				debug: isDev(),
				onReady: handleReady,
				onLost: handleLost,
				// Any teardown — unmount, the handle's `cleanup()`, or the give-up
				// after an unrecoverable GPU loss — releases the observers too.
				onDestroy: releaseObservers,
			}
		);
		engineRef.current = engine;

		return () => {
			releaseObservers();
			engine?.destroy();
			if (engineRef.current === engine) engineRef.current = null;
		};
	}, [optionsRef, handleReady, handleLost]);

	// The two props the engine reads again after mount: `quality` at every
	// engine activation (a post-loss reboot re-resolves the tier), `interactive`
	// when the asynchronous first activation decides whether to hook the
	// pointer listener. On mount this repeats the values the engine started
	// with, which is a no-op for it.
	useEffect(() => {
		engineRef.current?.setOptions({ quality, interactive });
	}, [quality, interactive]);

	return (
		<div
			className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
			aria-hidden="true"
		>
			<canvas ref={canvasRef} className="block h-full w-full" />
		</div>
	);
}
