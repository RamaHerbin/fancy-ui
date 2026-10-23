import { forwardRef, useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { createPixelScene, type PixelSceneEngine } from "./pixel-scene-core.js";
import { getScenePainter, type PixelSceneName } from "./pixel-scene-scenes.js";
import {
	PIXEL_SCENE_HDR_RESTART_MS,
	PIXEL_SCENE_HDR_RESTARTS,
	pixelSceneHdrAvailable,
	startPixelSceneHdr,
} from "./pixel-scene-hdr.js";
import type { PixelSceneHdrLook } from "./pixel-scene-hdr.js";

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
export interface PixelSceneProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
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
	/** HDR rendering: `calibrated` (glow 1 = the SDR dot, sRGB) or `vivid` (the prototype's hotter, display-p3 look) */
	hdrLook?: PixelSceneHdrLook;
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
	className?: string;
	/** Copy rendered above the picture */
	children?: ReactNode;
}

/** The options the engine is created with, read once at creation time. */
interface CreateProps {
	scene: PixelSceneName;
	night: boolean;
	cell: number;
	dot: number;
	lens: boolean;
	lensRadius: number;
	ink: string;
	paused: boolean;
	wave: boolean;
	surfaces: readonly [string, string] | null;
	inks: readonly [string, string] | null;
}

export const PixelScene = forwardRef<HTMLDivElement, PixelSceneProps>(function PixelScene(
	{
		scene = "alpine",
		night = false,
		cell = 5,
		dot = 4,
		lens = true,
		lensRadius = 21,
		hdr = true,
		hdrLook = "calibrated",
		ink = "currentColor",
		paused = false,
		wave = true,
		surfaces,
		inks,
		className,
		children,
		...restProps
	},
	forwardedRef
) {
	// The nodes, not refs: the mount effect is keyed on them, so it runs the
	// moment both exist rather than racing the first commit.
	const [host, hostRef] = useElementRef<HTMLDivElement>();
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();
	const [hdrCanvas, hdrCanvasRef] = useElementRef<HTMLCanvasElement>();
	const composedHostRef = useComposedRefs<HTMLDivElement>(forwardedRef, hostRef);

	/** Plain ref on purpose: nothing rendered depends on the engine. */
	const engineRef = useRef<PixelSceneEngine | null>(null);
	const [engineReady, setEngineReady] = useState(false);
	/** False on the server and the first client render: the HDR canvas appears only after mount. */
	const [hdrCapable, setHdrCapable] = useState(false);
	const [hdrOn, setHdrOn] = useState(false);
	/** Bumped to start the HDR layer again after a device loss; the effect below depends on it. */
	const [hdrRun, setHdrRun] = useState(0);
	const hdrRestarts = useRef(0);

	// The Svelte source creates the engine in `onMount` from `untrack`ed props:
	// the creation reads the current values without becoming a dependency.
	const createProps = useLiveRef<CreateProps>({
		scene,
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
	});

	useEffect(() => {
		if (!host || !canvas) return;
		const p = createProps.current;
		const engine = createPixelScene(
			{ host, canvas },
			{
				painter: getScenePainter(p.scene),
				night: p.night,
				cell: p.cell,
				dot: p.dot,
				lens: p.lens,
				lensRadius: p.lensRadius,
				ink: p.ink,
				paused: p.paused,
				wave: p.wave,
				surfaces: p.surfaces,
				inks: p.inks,
			}
		);
		engineRef.current = engine;
		setEngineReady(engine !== null);
		return () => {
			engine?.destroy();
			engineRef.current = null;
			setEngineReady(false);
		};
	}, [host, canvas, createProps]);

	// --- live props: each effect pushes its own keys; the engine ignores absent ones

	useEffect(() => {
		engineRef.current?.setOptions({ painter: getScenePainter(scene), night });
	}, [scene, night, engineReady]);

	useEffect(() => {
		engineRef.current?.setOptions({ cell, dot });
	}, [cell, dot, engineReady]);

	const surfacesKey = surfaces ? `${surfaces[0]}\n${surfaces[1]}` : "";
	const inksKey = inks ? `${inks[0]}\n${inks[1]}` : "";
	useEffect(() => {
		engineRef.current?.setOptions({
			lens,
			lensRadius,
			ink,
			paused,
			wave,
			surfaces: surfacesKey ? (surfacesKey.split("\n") as [string, string]) : null,
			inks: inksKey ? (inksKey.split("\n") as [string, string]) : null,
		});
		// Tuples by value: a new array with the same colours is no change.
	}, [lens, lensRadius, ink, paused, wave, surfacesKey, inksKey, engineReady]);

	// HDR: decided after mount only, so SSR and hydration render the 2D canvas alone.
	useEffect(() => {
		setHdrCapable(hdr && pixelSceneHdrAvailable());
	}, [hdr]);

	useEffect(() => {
		const engine = engineRef.current;
		if (!hdrCanvas || !engineReady || !hdrCapable || !engine) return;
		let cancelled = false;
		let stop: (() => void) | null = null;
		let retry: ReturnType<typeof setTimeout> | null = null;
		// A lost device usually comes back (GPU process restarted, driver reset):
		// start again after a growing pause, a few times, before giving the layer up.
		const restart = () => {
			if (hdrRestarts.current >= PIXEL_SCENE_HDR_RESTARTS) {
				setHdrCapable(false);
				return;
			}
			hdrRestarts.current++;
			retry = setTimeout(() => {
				retry = null;
				setHdrRun((n) => n + 1);
			}, PIXEL_SCENE_HDR_RESTART_MS * hdrRestarts.current);
		};
		void startPixelSceneHdr(hdrCanvas, hdrLook).then((layer) => {
			if (cancelled || engineRef.current !== engine) {
				layer?.destroy();
				return;
			}
			if (!layer) {
				// Nothing to start on the first try (no adapter, tone mapping refused): give
				// up at once. During a restart the GPU may still be on its way back.
				if (hdrRestarts.current === 0) setHdrCapable(false);
				else restart();
				return;
			}
			engine.setOptions({ onFrame: (frame) => layer.render(frame) });
			setHdrOn(true);
			stop = () => {
				engine.setOptions({ onFrame: null });
				layer.destroy();
				setHdrOn(false);
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
		// hdrRun is read by no line above: it re-runs the effect after a device loss.
	}, [hdrCanvas, engineReady, hdrCapable, hdrRun, hdrLook]);

	return (
		<div
			ref={composedHostRef}
			className={cn("pixel-scene relative overflow-hidden", className)}
			data-scene={scene}
			data-night={night ? "" : undefined}
			data-hdr={hdrOn ? "" : undefined}
			{...restProps}
		>
			<canvas
				ref={canvasRef}
				className="pointer-events-none absolute inset-0 block h-full w-full"
				aria-hidden="true"
			/>
			{hdrCapable ? (
				// Lit cells above SDR white, over the 2D picture, on HDR displays only.
				<canvas
					ref={hdrCanvasRef}
					className="pixel-scene__hdr pointer-events-none absolute inset-0 block h-full w-full"
					aria-hidden="true"
				/>
			) : null}
			{children != null ? (
				<div className="pixel-scene__content relative z-[1] h-full w-full">{children}</div>
			) : null}
		</div>
	);
});
