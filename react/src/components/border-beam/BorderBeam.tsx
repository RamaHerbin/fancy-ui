import type { CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./border-beam.css";

/**
 * BorderBeam - a single comet of light riding a container's border
 *
 * A white-hot head leads a long, feathered tail that fades from `colorFrom`
 * to `colorTo` to nothing. The hairline under it stays dim except within
 * the comet's reach, a soft bloom sits on the edge, and a faint spill of
 * light falls just inside the container.
 *
 * Place it as the last child of a container with `position: relative`
 * (and usually `overflow: hidden`). It inherits the container's
 * `border-radius`; set `--border-beam-radius` if the path needs a radius
 * the browser cannot read from the box itself.
 */
export interface BorderBeamProps {
	/** Additional CSS classes */
	className?: string;
	/** Diameter of the pool of light around the comet's head, in pixels */
	size?: number;
	/** Time for one full lap of the border, in seconds */
	duration?: number;
	/** Border width in pixels */
	borderWidth?: number;
	/**
	 * Where along the border the comet starts, as a percentage of the
	 * perimeter (0-100, clockwise from the top-left corner). With reduced
	 * motion, this is where it rests.
	 */
	anchor?: number;
	/** Colour of the comet's head and the start of its tail */
	colorFrom?: string;
	/** Colour the tail fades into */
	colorTo?: string;
	/**
	 * Delay in seconds. The comet runs from the first frame, already
	 * `delay` seconds behind where it would otherwise be, so stacked beams
	 * spread out along the border.
	 */
	delay?: number;
	/** Length of the tail as a share of the perimeter (0-1) */
	tail?: number;
	/** Strength of the bloom and the inner spill of light (0-1) */
	glow?: number;
	/** Travel counter-clockwise instead of clockwise */
	reverse?: boolean;
}

/** Number of overlapping pieces the sharp tail is drawn with. More pieces
 * bend around the corners more smoothly. */
export const TAIL_SEGMENTS = 18;
/** The blurred bloom is forgiving: fewer, longer pieces are enough. */
export const BLOOM_SEGMENTS = 8;

export interface TailSegment {
	/** Position along the tail, 0 = right behind the head, 1 = tail end */
	t: number;
	/** Opacity of this piece */
	alpha: number;
	/** Thickness factor (1 at the head, tapering towards the end) */
	thickness: number;
}

/** Evenly spaced pieces with an eased fade and a tapering thickness. */
export function tailSegments(count: number): TailSegment[] {
	return Array.from({ length: count }, (_, i) => {
		const t = (i + 0.5) / count;
		return {
			t: Number(t.toFixed(4)),
			alpha: Number(Math.pow(1 - t, 1.6).toFixed(4)),
			thickness: Number((1 - 0.7 * t).toFixed(4)),
		};
	});
}

function clamp01(n: number): number {
	return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/**
 * Turn `delay` into a phase: how far into its lap the comet is at first
 * paint (a negative `animation-delay`), and where it rests when motion is
 * reduced (a percentage of the perimeter).
 */
export function beamPhase(
	duration: number,
	delay: number,
	anchor: number,
	reverse: boolean
): { offset: number; park: number } {
	const d = duration > 0 ? duration : 1;
	const lag = ((delay % d) + d) % d;
	const offset = lag === 0 ? 0 : -(d - lag);
	const dir = reverse ? -1 : 1;
	const park = anchor - (dir * lag * 100) / d;
	return { offset: Number(offset.toFixed(4)), park: Number(park.toFixed(4)) };
}

// The piece lists never change: computed once at module load, like the
// Svelte component's per-instance constants.
const tailPieces = tailSegments(TAIL_SEGMENTS);
const bloomPieces = tailSegments(BLOOM_SEGMENTS);

function piece(p: TailSegment, count: number): CSSProperties {
	return {
		"--bb-t": p.t,
		"--bb-alpha": p.alpha,
		"--bb-thick": p.thickness,
		"--bb-count": count,
	} as CSSProperties;
}

export function BorderBeam({
	className,
	size = 200,
	duration = 9,
	borderWidth = 1.5,
	anchor = 90,
	colorFrom = "#8ec5ff",
	colorTo = "#c084fc",
	delay = 0,
	tail = 0.25,
	glow = 0.6,
	reverse = false,
}: BorderBeamProps) {
	const phase = beamPhase(duration, delay, anchor, reverse);

	const style = {
		"--border-beam-size": size,
		"--border-beam-duration": `${duration}s`,
		"--border-beam-anchor": anchor,
		"--border-beam-border-width": borderWidth,
		"--border-beam-color-from": colorFrom,
		"--border-beam-color-to": colorTo,
		"--border-beam-delay": `${delay}s`,
		"--border-beam-tail": clamp01(tail),
		"--border-beam-glow": clamp01(glow),
		"--border-beam-offset": `${phase.offset}s`,
		"--border-beam-park": `${phase.park}%`,
		"--border-beam-dir": reverse ? -1 : 1,
	} as CSSProperties;

	return (
		<div
			className={cn(
				"border-beam",
				"pointer-events-none absolute inset-0 rounded-[inherit]",
				className
			)}
			data-direction={reverse ? "reverse" : "forward"}
			aria-hidden="true"
			style={style}
		>
			{/* faint light falling just inside the edge, clipped to the container */}
			<div className="bb-spill-clip">
				<span className="bb-ride bb-spill" />
			</div>

			{/* the bloom: a blurred copy of the comet straddling the edge */}
			<div className="bb-bloom">
				{bloomPieces.map((p) => (
					<span
						key={p.t}
						className="bb-ride bb-piece bb-bloom-piece"
						style={piece(p, BLOOM_SEGMENTS)}
					/>
				))}
				<span className="bb-ride bb-bloom-head" />
			</div>

			{/* the halo: a tight glow hugging the lit hairline */}
			<div className="bb-halo">
				{bloomPieces.map((p) => (
					<span
						key={p.t}
						className="bb-ride bb-piece bb-halo-piece"
						style={piece(p, BLOOM_SEGMENTS)}
					/>
				))}
			</div>

			{/* the hairline: dim, lit only within the comet's reach */}
			<div className="bb-ring">
				<span className="bb-rail" />
				<span className="bb-ride bb-reach" />
				{tailPieces.map((p) => (
					<span
						key={p.t}
						className="bb-ride bb-piece bb-tail-piece"
						style={piece(p, TAIL_SEGMENTS)}
					/>
				))}
				<span className="bb-ride bb-head" />
			</div>

			{/* the white-hot point of the head, sitting on the edge */}
			<span className="bb-ride bb-spark" />
		</div>
	);
}
