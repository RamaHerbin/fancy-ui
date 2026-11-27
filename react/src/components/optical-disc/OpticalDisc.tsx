import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import {
	createOpticalDisc,
	fallbackBackground,
	OPTICAL_DISC_DEFAULTS,
	type OpticalDiscEngine,
} from "./optical-disc-core.js";

/**
 * OpticalDisc - a disc turning in space, drawn by one WebGL fragment shader.
 *
 * One side carries a printed label; the other is a mirror with a diffraction
 * grating, so every highlight opens into wedges of colour as the disc turns.
 * The simulation lives in `optical-disc-core.ts`, shared with the Svelte and
 * Vue packages; this file only owns the canvas and forwards the props.
 */
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
	className?: string;
}

export function OpticalDisc({
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
	className = "",
}: OpticalDiscProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<OpticalDiscEngine | null>(null);
	// State as well as a ref: the fallback leaves the tree once the engine runs.
	const [ready, setReady] = useState(false);
	const reducedMotion = useReducedMotion();

	const live = {
		label: label ?? null,
		spin,
		tilt,
		iridescence,
		pitch,
		labelColor,
		tint,
		interactive,
		reducedMotion,
	};
	// Mount-time values are read through a ref, so no prop can rebuild the engine.
	const initRef = useLiveRef({ ...live, angle });

	// One engine per mount. `releaseContext: false`: Strict Mode and Fast Refresh
	// run this effect twice on the same <canvas>, and a lost context stays lost.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const instance = createOpticalDisc({ canvas }, { ...initRef.current, releaseContext: false });
		if (!instance) return;
		engineRef.current = instance;
		setReady(true);
		return () => {
			engineRef.current = null;
			setReady(false);
			instance.destroy();
		};
	}, [initRef]);

	useEffect(() => {
		engineRef.current?.setOptions({
			label: label ?? null,
			spin,
			tilt,
			iridescence,
			pitch,
			labelColor,
			tint,
			interactive,
			reducedMotion,
		});
	}, [label, spin, tilt, iridescence, pitch, labelColor, tint, interactive, reducedMotion]);

	return (
		<div
			className={cn("fancy-optical-disc relative aspect-square w-full", className)}
			role={alt ? "img" : undefined}
			aria-label={alt}
			aria-hidden={alt ? undefined : true}
			data-ready={ready ? "" : undefined}
		>
			{/* Shown on the server, before the first frame, and when WebGL is unavailable. */}
			{ready ? null : (
				<div
					className="fancy-optical-disc-fallback absolute inset-[12%] rounded-full"
					style={{ background: fallbackBackground(labelColor) }}
				/>
			)}
			<canvas
				ref={canvasRef}
				className="absolute inset-0 block h-full w-full"
				style={interactive ? { touchAction: "pan-y", cursor: "grab" } : undefined}
			/>
		</div>
	);
}
