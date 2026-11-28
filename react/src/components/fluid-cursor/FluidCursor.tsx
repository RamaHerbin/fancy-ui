import { useEffect, useRef } from "react";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { REDUCED_MOTION_QUERY, useReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import { isDev } from "./dev.js";
import { createFluidCursor, type FluidCursorEngine } from "./fluid-cursor-core.js";
import type { ColorRGB, FluidCursorHandle } from "./fluid-shared.js";

export interface FluidCursorProps {
	simResolution?: number;
	dyeResolution?: number;
	captureResolution?: number;
	densityDissipation?: number;
	velocityDissipation?: number;
	pressure?: number;
	pressureIterations?: number;
	curl?: number;
	splatRadius?: number;
	splatForce?: number;
	shading?: boolean;
	colorUpdateSpeed?: number;
	backColor?: ColorRGB | string;
	transparent?: boolean;
	fluidColor?: string;
	fluidColors?: string[];
	colorIntensity?: number;
	className?: string;
	autoSplat?: boolean;
	autoSplatInterval?: number;
	interactive?: boolean;
	pauseWhenHidden?: boolean;
	splatOnMount?: boolean;
	allowMultiple?: boolean;
	contained?: boolean;
	hdr?: boolean;
	hdrBoost?: number;
	/**
	 * Experimental: render the fluid as a retro ordered-dither bitmap.
	 * The dye is snapped to a chunky pixel grid and each color channel is
	 * quantized against a procedural 4x4 Bayer matrix, so dot density
	 * encodes brightness while hues are preserved. Forces the WebGL
	 * renderer (`hdr` is ignored while set). Applied at mount, like the
	 * other simulation props.
	 */
	dither?: boolean;
	/** Size of one dithered pixel in CSS pixels (minimum 1). */
	ditherPixelSize?: number;
	/** Color levels per channel in dither mode, clamped to [2, 16]. */
	ditherLevels?: number;
	/**
	 * Called once the fluid engine is live, with an imperative handle to
	 * drive the simulation programmatically (trace a path via
	 * `moveTo`/`penUp`, fire a one-off `burst`) and read back the actual
	 * `renderLevel`. Pair with `interactive={false}` to drive it entirely
	 * without a real cursor.
	 */
	onReady?: (handle: FluidCursorHandle) => void;
}

/** The reduced-motion preference as the browser reports it right now. */
function prefersReducedMotionNow(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(REDUCED_MOTION_QUERY).matches
	);
}

export function FluidCursor({
	simResolution = 128,
	dyeResolution = 1440,
	captureResolution = 512,
	densityDissipation = 3.5,
	velocityDissipation = 2,
	pressure = 0.1,
	pressureIterations = 20,
	curl = 3,
	splatRadius = 0.2,
	splatForce = 6000,
	shading = true,
	colorUpdateSpeed = 10,
	backColor = { r: 0.5, g: 0, b: 0 },
	transparent = true,
	fluidColor,
	fluidColors,
	colorIntensity = 0.15,
	className = "",
	autoSplat = false,
	autoSplatInterval = 1500,
	interactive = true,
	pauseWhenHidden = true,
	splatOnMount = false,
	allowMultiple = false,
	contained = true,
	hdr = false,
	hdrBoost = 1.5,
	dither = false,
	ditherPixelSize = 3,
	ditherLevels = 4,
	onReady,
}: FluidCursorProps) {
	const reducedMotion = useReducedMotion();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<FluidCursorEngine | null>(null);

	// Every option at its latest committed value, for the engine to read when
	// it starts — the counterpart of the Svelte wrapper's `untrack`. Nothing
	// here is a dependency of the start effect: the simulation setup is
	// snapshotted by the engine and a later change is ignored until the
	// component is re-keyed, exactly as before.
	const optionsRef = useLiveRef({
		simResolution,
		dyeResolution,
		captureResolution,
		densityDissipation,
		velocityDissipation,
		pressure,
		pressureIterations,
		curl,
		splatRadius,
		splatForce,
		shading,
		colorUpdateSpeed,
		backColor,
		transparent,
		fluidColor,
		fluidColors,
		colorIntensity,
		autoSplat,
		autoSplatInterval,
		interactive,
		pauseWhenHidden,
		splatOnMount,
		allowMultiple,
		contained,
		hdr,
		hdrBoost,
		dither,
		ditherPixelSize,
		ditherLevels,
		onReady,
	});

	// The simulation itself lives in the framework-free engine shared with the
	// Svelte and Vue packages (`fluid-cursor-core.ts`, a byte-identical copy).
	// The reduced-motion preference is the one dependency: it stops the fluid
	// (reduce on) or starts it afresh (reduce off). Re-running on anything
	// else would rebuild the whole solver on every unrelated re-render.
	//
	// The live media state is read as well: on a hydrated page the hook still
	// answers with its server value (`false`) during this first passive flush,
	// and only learns the real preference in its own effect, which schedules a
	// re-render. Without this read, reduce-on would start the engine once
	// (context, frame, listeners, onReady) just to tear it down again.
	useEffect(() => {
		if (reducedMotion || prefersReducedMotionNow()) return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const engine = createFluidCursor(
			{ canvas },
			{
				...optionsRef.current,
				dev: isDev(),
				// StrictMode and Fast Refresh re-run this effect against the same
				// <canvas> element, and a context dropped through
				// WEBGL_lose_context is never handed out again: the second start
				// would get a dead context. The engine still deletes every GL
				// object it allocated; only the context itself is kept.
				releaseContext: false,
			}
		);
		engineRef.current = engine;

		return () => {
			engine?.destroy();
			if (engineRef.current === engine) engineRef.current = null;
		};
	}, [reducedMotion, optionsRef]);

	// The six options the running engine keeps re-reading. Pushed after every
	// change; on mount this repeats the values the engine just started with,
	// which is a no-op for it. `fluidColor` / `fluidColors` / `onReady` are
	// always passed, so `undefined` clears an override.
	useEffect(() => {
		engineRef.current?.setOptions({
			fluidColor,
			fluidColors,
			contained,
			interactive,
			allowMultiple,
			onReady,
		});
	}, [fluidColor, fluidColors, contained, interactive, allowMultiple, onReady]);

	return (
		<div
			className={cn(
				contained
					? "pointer-events-none absolute inset-0 h-full w-full"
					: "pointer-events-none fixed top-0 left-0 z-50 size-full",
				className
			)}
		>
			{/* Keyed on the preference: a stop leaves a blank canvas rather than
			    the last drawn frame, and a restart gets a fresh element. */}
			<canvas
				key={reducedMotion ? "static" : "live"}
				ref={canvasRef}
				className={contained ? "block h-full w-full" : "block h-screen w-screen"}
			/>
		</div>
	);
}

/**
 * @deprecated Use `FluidCursor` instead. `FluidCursorAdvanced` has been merged into `FluidCursor`.
 */
export const FluidCursorAdvanced = FluidCursor;

/**
 * @deprecated Use `FluidCursorProps` instead. `FluidCursorAdvanced` has been merged into `FluidCursor`.
 */
export interface FluidCursorAdvancedProps extends FluidCursorProps {}
