import { useEffect } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { attachHdrLight } from "../../internals/hdr/hdr-light.js";
import { conicBorderProbe } from "../../internals/hdr/hdr-probes.js";
import { cn } from "../../utils.js";
import "./neon-border.css";

/**
 * NeonBorder - a two-colour neon tube around its content
 *
 * A faint tube runs all the way round; two beams, one per colour, chase
 * each other along it from opposite sides. Each beam has a white-hot core
 * and a coloured glow that spills both inside and outside the edge. The
 * glow hums (a slow breathing), and the tube flickers once as it ignites.
 */
export interface NeonBorderProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
	/** First neon color */
	color1?: string;
	/** Second neon color */
	color2?: string;
	/**
	 * How much of the tube is lit: none (two short beams, static), half
	 * (two short beams chasing), full (two long beams that nearly close the ring)
	 */
	animationType?: "none" | "half" | "full";
	/** Time for the beams to travel once around, in seconds */
	duration?: number;
	/** Additional CSS classes */
	className?: string;
	/** Content */
	children?: ReactNode;
	/**
	 * On a display that reports HDR, light the beams' heads above SDR white
	 * in a WebGPU layer with extended tone mapping, following the CSS travel
	 * and the ignite flicker exactly. Elsewhere nothing changes.
	 */
	hdr?: boolean;
}

export type NeonAnimationType = NonNullable<NeonBorderProps["animationType"]>;

/** Share of the turn each beam covers, in %. */
export function beamArc(type: NeonAnimationType): number {
	return type === "full" ? 46 : 22;
}

/**
 * The static tube (`animationType="none"`): lit at two opposite corners,
 * the first colour top-left and the second bottom-right.
 */
export function neonCorners(color1: string, color2: string, core = false): string {
	const tint = (c: string) => (core ? `color-mix(in srgb, ${c} 45%, #fff)` : c);
	return `linear-gradient(135deg, ${tint(color1)} 0%, transparent 32%, transparent 68%, ${tint(color2)} 100%)`;
}

/**
 * The two beams as one conic gradient: each fades in from its tail and
 * cuts off sharply at its head, the second half a turn behind the first.
 * `core` whitens each colour for the hot centre of the tube.
 */
export function neonBeams(color1: string, color2: string, arc: number, core = false): string {
	const tint = (c: string) => (core ? `color-mix(in srgb, ${c} 45%, #fff)` : c);
	const beam = (c: string, from: number) => {
		const head = from + arc;
		return [
			`transparent ${from}%`,
			`color-mix(in srgb, ${tint(c)} 55%, transparent) ${(from + arc * 0.45).toFixed(1)}%`,
			`${tint(c)} ${(head - 0.6).toFixed(1)}%`,
			`transparent ${head.toFixed(1)}%`,
		].join(", ");
	};
	return `conic-gradient(from var(--neon-angle), ${beam(color1, 0)}, ${beam(color2, 50)}, transparent 100%)`;
}

function getWidth(type: NeonAnimationType): number {
	switch (type) {
		case "none":
			return 12;
		case "half":
			return 50;
		case "full":
			return 100;
	}
}

export function NeonBorder({
	color1 = "#0496ff",
	color2 = "#ff0a54",
	animationType = "half",
	duration = 6,
	className,
	children,
	hdr = true,
	style,
	...rest
}: NeonBorderProps) {
	const [root, rootRef] = useElementRef<HTMLDivElement>();
	const [light, lightRef] = useElementRef<HTMLSpanElement>();
	const [hdrCanvas, hdrCanvasRef] = useElementRef<HTMLCanvasElement>();
	const live = useLiveRef({ animationType, color1, color2 });

	// Reads the live `--neon-angle` and the tube's live opacity (ignite), so the
	// HDR heads travel and strike with the CSS beams.
	useEffect(() => {
		if (!root || !light || !hdrCanvas) return;
		const tube = light;
		const head = (t: number) => 0.3 + 3.2 * t ** 3;
		return attachHdrLight({
			host: root,
			canvas: hdrCanvas,
			probe: conicBorderProbe({
				angleFrom: root,
				angleVar: "--neon-angle",
				radius: () => 8,
				halo: 4,
				level: () => {
					if (live.current.animationType === "none") return 0;
					const o = parseFloat(getComputedStyle(tube).opacity);
					return Number.isFinite(o) ? o : 1;
				},
				arcs: () => {
					const span = beamArc(live.current.animationType);
					return [
						{ from: 0, to: span, color: () => live.current.color1, intensity: head, white: 0.5 },
						{
							from: 50,
							to: 50 + span,
							color: () => live.current.color2,
							intensity: head,
							white: 0.5,
						},
					];
				},
			}),
		});
	}, [root, light, hdrCanvas, live]);

	const arc = beamArc(animationType);
	const animated = animationType !== "none";

	const styleVars = {
		"--neon-duration": `${duration}s`,
		"--neon-color1": color1,
		"--neon-color2": color2,
		"--neon-width": `${getWidth(animationType)}%`,
		"--neon-beams": animated ? neonBeams(color1, color2, arc) : neonCorners(color1, color2),
		"--neon-core": animated
			? neonBeams(color1, color2, arc, true)
			: neonCorners(color1, color2, true),
	} as CSSProperties;

	return (
		<div
			{...rest}
			ref={rootRef}
			className={cn(
				"neon-border-container relative z-10 inline-block h-10 w-full max-w-sm rounded-lg p-px",
				animated && "neon-animated",
				className
			)}
			style={{ ...style, ...styleVars }}
		>
			{children}

			<span className="neon-tube" aria-hidden="true"></span>
			<span ref={lightRef} className="neon-light" aria-hidden="true">
				<span className="neon-glow">
					<span></span>
				</span>
				<span className="neon-core"></span>
			</span>
			{hdr ? <canvas ref={hdrCanvasRef} className="neon-hdr" aria-hidden="true" /> : null}
		</div>
	);
}
