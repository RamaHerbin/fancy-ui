import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import "./animated-beam.css";

/**
 * A target element for the beam. The Svelte side receives the live elements
 * (`bind:this` values); in React the same prop also accepts a ref object,
 * since `ref.current` is how a React consumer holds an element.
 */
export type AnimatedBeamTarget = HTMLElement | { readonly current: HTMLElement | null };

export interface AnimatedBeamProps {
	className?: string;
	containerRef: AnimatedBeamTarget | null;
	fromRef: AnimatedBeamTarget | null;
	toRef: AnimatedBeamTarget | null;
	/** Vertical bend of the fibre in px (the quadratic control point sits this far above the start). */
	curvature?: number;
	/** Send the light from `toRef` back to `fromRef` (the bloom then lands on `fromRef`). */
	reverse?: boolean;
	/** Fibre colour. Unset = theme-aware glass (dark on light, pale on dark). */
	pathColor?: string;
	/** Width of the fibre core and of the light packet, in px. */
	pathWidth?: number;
	/** Opacity of the fibre. Unset = 1 for the theme-aware glass, 0.2 when `pathColor` is set. */
	pathOpacity?: number;
	/** Colour of the packet's leading edge (its white-hot head is this colour mixed with white). */
	gradientStartColor?: string;
	/** Colour of the far end of the dispersing tail, and of the arrival bloom. */
	gradientStopColor?: string;
	/** Seconds before the first packet leaves. */
	delay?: number;
	/** Seconds per packet cycle. Unset = derived from `seed` (between 4 and 7). */
	duration?: number;
	startXOffset?: number;
	startYOffset?: number;
	endXOffset?: number;
	endYOffset?: number;
	/** Packets in flight at once, spaced evenly over one cycle. */
	pulses?: number;
	/** Length of the packet's tail as a fraction of the fibre (0.05–0.9). */
	tail?: number;
	/** Strength of the soft glow under the packet and the arrival bloom (0–1). */
	glow?: number;
	/** Seed for the default `duration`, so server and browser agree. */
	seed?: number;
}

/** Small seedable PRNG. Same seed → same sequence, on the server and in the browser. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The default cycle length for a seed: somewhere between 4 and 7 seconds. */
export function beamDuration(seed = 1): number {
	return mulberry32(seed)() * 3 + 4;
}

/** Every flow path is normalised to this length, so dash maths is in fractions of the fibre. */
const PATH_LENGTH = 1000;
/** Share of the cycle the head spends travelling; the rest drains the tail into the node. */
export const ARRIVAL = 0.78;

export interface PacketLayer {
	key: "stop" | "mid" | "start" | "head";
	color: string;
	/** Dash length, in PATH_LENGTH units. */
	len: number;
	/** How far this layer has fallen behind the head by the moment of arrival. */
	lag: number;
	opacity: number;
	/** Stroke width as a multiple of `pathWidth`. */
	width: number;
	/** The white-hot core: on light surfaces it keeps more of its colour so it never vanishes. */
	core?: boolean;
}

/**
 * The packet: a white-hot head followed by three chromatic sub-pulses,
 * each longer, dimmer and further behind than the one before, so the tail
 * spreads out as it travels — light dispersing through glass. Listed bottom
 * to top (the order they are painted).
 *
 * Each chromatic band is drawn as three stacked dashes sharing one leading
 * edge (full, two thirds, one third of its length), so its brightness ramps
 * up toward the head instead of ending in a hard block.
 */
export function packetLayers(tail: number, start: string, stop: string): PacketLayer[] {
	const t = Math.min(0.9, Math.max(0.05, Number.isFinite(tail) ? tail : 0.35)) * PATH_LENGTH;
	const spread = t * 0.07;
	const mid = `color-mix(in oklab, ${start} 50%, ${stop})`;
	const hot = `color-mix(in oklab, ${start} 45%, white)`;
	const head = Math.max(12, t * 0.1);
	const bands: Array<[PacketLayer["key"], string, number, number, number]> = [
		["stop", stop, t, spread * 3, 0.26],
		["mid", mid, t * 0.66, spread * 2, 0.34],
		["start", start, t * 0.38, spread, 0.46],
	];
	const layers: PacketLayer[] = [];
	for (const [key, color, len, lag, opacity] of bands) {
		for (const share of [1, 2 / 3, 1 / 3]) {
			layers.push({ key, color, len: len * share, lag, opacity, width: 1 });
		}
	}
	layers.push({ key: "head", color: start, len: head * 1.7, lag: 0, opacity: 1, width: 1.6 });
	layers.push({ key: "head", color: hot, len: head, lag: 0, opacity: 1, width: 0.7, core: true });
	return layers;
}

/** The blurred copies under the packet: one per band plus a wide head. */
export function glowLayers(tail: number, start: string, stop: string): PacketLayer[] {
	const all = packetLayers(tail, start, stop);
	const bands = all.filter((l, i) => l.key !== "head" && i % 3 === 0);
	// Always present: packetLayers ends with the head sheath and the head core.
	const head = all[all.length - 2] as PacketLayer;
	return [
		...bands.map((l, i) => ({
			...l,
			opacity: Math.min(1, l.opacity * (1.5 + i * 0.4)),
			width: 2.5,
		})),
		{ ...head, len: head.len * 1.6, opacity: 1, width: 3.5 },
	];
}

/** Dash offsets for the three keyframes: hidden before the start, arrival, fully drained. */
function dashVars(layer: PacketLayer): Record<string, string> {
	const o0 = layer.len + 4;
	const o1 = layer.len - (PATH_LENGTH - layer.lag);
	const o2 = -(PATH_LENGTH + 4);
	return {
		"--_len": layer.len.toFixed(1),
		"--_o0": o0.toFixed(1),
		"--_o1": o1.toFixed(1),
		"--_o2": o2.toFixed(1),
	};
}

function resolveTarget(target: AnimatedBeamTarget | null | undefined): HTMLElement | null {
	if (!target) return null;
	return target instanceof HTMLElement ? target : target.current;
}

interface BeamGeometry {
	pathD: string;
	flowD: string;
	ends: { x1: number; y1: number; x2: number; y2: number };
	landingRadius: number;
	width: number;
	height: number;
}

const EMPTY_GEOMETRY: BeamGeometry = {
	pathD: "",
	flowD: "",
	ends: { x1: 0, y1: 0, x2: 0, y2: 0 },
	landingRadius: 24,
	width: 0,
	height: 0,
};

export function AnimatedBeam({
	className = "",
	containerRef,
	fromRef,
	toRef,
	curvature = 0,
	reverse = false,
	pathColor,
	pathWidth = 2,
	pathOpacity,
	gradientStartColor = "#FFAA40",
	gradientStopColor = "#9C40FF",
	delay = 0,
	duration,
	startXOffset = 0,
	startYOffset = 0,
	endXOffset = 0,
	endYOffset = 0,
	pulses = 1,
	tail = 0.35,
	glow = 0.6,
	seed = 1,
}: AnimatedBeamProps) {
	// Stable across server render and hydration — the counterpart of `$props.id()`.
	const uid = useFancyId("beam");
	const id = uid; // the gradient keeps the bare id
	const glowId = `${uid}-glow`;
	const bloomId = `${uid}-bloom`;

	const reduced = useReducedMotion();

	const cycle =
		Number.isFinite(duration) && (duration as number) > 0
			? (duration as number)
			: beamDuration(seed);
	const packetCount = Math.max(1, Math.min(12, Math.floor(Number.isFinite(pulses) ? pulses : 1)));
	const packets = Array.from(
		{ length: packetCount },
		(_, i) => +(delay + (i * cycle) / packetCount).toFixed(3)
	);
	const layers = packetLayers(tail, gradientStartColor, gradientStopColor);
	const glows = glowLayers(tail, gradientStartColor, gradientStopColor);
	const glowAmount = Math.min(1, Math.max(0, Number.isFinite(glow) ? glow : 0.6));
	const midColor = `color-mix(in oklab, ${gradientStartColor} 50%, ${gradientStopColor})`;
	const hotColor = `color-mix(in oklab, ${gradientStartColor} 45%, white)`;

	// Fibre: theme-aware glass by default; an explicit pathColor keeps the old faint-line behaviour.
	const fibreOpacity = pathOpacity ?? (pathColor ? 0.2 : 1);
	const fibreStyle: CSSProperties | undefined = pathColor ? { stroke: pathColor } : undefined;

	const [geo, setGeo] = useState<BeamGeometry>(EMPTY_GEOMETRY);
	const { pathD, flowD, ends, landingRadius } = geo;

	/** Where the light lands — the far end of the flow. */
	const landing = reverse ? { x: ends.x1, y: ends.y1 } : { x: ends.x2, y: ends.y2 };
	const launch = reverse ? { x: ends.x2, y: ends.y2 } : { x: ends.x1, y: ends.y1 };

	// The path calculation reads the current render's props, exactly like the
	// Svelte closure. `useEventCallback` keeps the identity stable for the life
	// of the component while publishing the closure from an insertion effect, so
	// the long-lived ResizeObserver callback never goes stale and a render React
	// throws away never installs itself.
	const updatePath = useEventCallback(() => {
		const container = resolveTarget(containerRef);
		const from = resolveTarget(fromRef);
		const to = resolveTarget(toRef);
		if (!(container && from && to)) return;
		const containerRect = container.getBoundingClientRect();
		const rectA = from.getBoundingClientRect();
		const rectB = to.getBoundingClientRect();

		const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
		const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
		const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
		const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

		// The dash-driven packet follows the path itself, so horizontal,
		// vertical and diagonal fibres all travel the same way.
		const cx = (startX + endX) / 2;
		const cy = startY - curvature;
		const d = `M ${startX},${startY} Q ${cx},${cy} ${endX},${endY}`;
		const target = reverse ? rectA : rectB;

		const next: BeamGeometry = {
			pathD: d,
			flowD: reverse ? `M ${endX},${endY} Q ${cx},${cy} ${startX},${startY}` : d,
			ends: { x1: startX, y1: startY, x2: endX, y2: endY },
			landingRadius: Math.max(8, Math.max(target.width, target.height) / 2),
			width: containerRect.width,
			height: containerRect.height,
		};
		// Both effects below may measure in the same commit; an unchanged
		// geometry keeps the previous object, so it does not re-render.
		setGeo((prev) =>
			prev.pathD === next.pathD &&
			prev.flowD === next.flowD &&
			prev.landingRadius === next.landingRadius &&
			prev.width === next.width &&
			prev.height === next.height
				? prev
				: next
		);
	});

	// Setup ResizeObserver — the counterpart of the Svelte container effect,
	// re-run only when the container target itself changes. Passive, not
	// layout: when the beam sits inside the container and receives ref
	// objects, React attaches the container's ref AFTER this child's layout
	// effects, so `containerRef.current` is still null in the layout phase and
	// a layout-only arm would never draw. Every ref is attached by the time
	// passive effects run. `updatePath` is identity-stable, so it never re-runs
	// this on its own.
	useEffect(() => {
		const container = resolveTarget(containerRef);
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			updatePath();
		});
		resizeObserver.observe(container);

		// Catch-up measure for the ref-object case above (otherwise a no-op:
		// an unchanged geometry keeps the previous state object).
		updatePath();

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef, updatePath]);

	// First trace, and a re-trace when the endpoints or the geometry props
	// change (the source's `$effect` tracks the three targets through
	// `updatePath`). Layout phase, not passive: until the measurement lands the
	// svg is 0x0 with an empty `d`, so a post-paint first measure shows one
	// frame with no beam.
	useIsomorphicLayoutEffect(() => {
		updatePath();
	}, [
		containerRef,
		fromRef,
		toRef,
		curvature,
		reverse,
		startXOffset,
		startYOffset,
		endXOffset,
		endYOffset,
		updatePath,
	]);

	return (
		<svg
			fill="none"
			aria-hidden="true"
			width={geo.width}
			height={geo.height}
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"animated-beam pointer-events-none absolute top-0 left-0 transform-gpu stroke-2",
				className
			)}
			viewBox={`0 0 ${geo.width} ${geo.height}`}
			data-duration={cycle.toFixed(3)}
			style={{ "--_dur": `${cycle.toFixed(3)}s` } as CSSProperties}
		>
			<defs>
				<linearGradient
					id={id}
					gradientUnits="userSpaceOnUse"
					x1={launch.x}
					y1={launch.y}
					x2={landing.x}
					y2={landing.y}
				>
					<stop offset="0%" style={{ stopColor: hotColor }} stopOpacity="0.9" />
					<stop offset="30%" style={{ stopColor: gradientStartColor }} />
					<stop offset="65%" style={{ stopColor: midColor }} />
					<stop offset="100%" style={{ stopColor: gradientStopColor }} />
				</linearGradient>
				<filter
					id={glowId}
					filterUnits="userSpaceOnUse"
					x={-40}
					y={-40}
					width={geo.width + 80}
					height={geo.height + 80}
				>
					<feGaussianBlur stdDeviation={1.5 + 4 * glowAmount} />
				</filter>
				<filter
					id={bloomId}
					filterUnits="userSpaceOnUse"
					x={-40}
					y={-40}
					width={geo.width + 80}
					height={geo.height + 80}
				>
					<feGaussianBlur stdDeviation={5 + 6 * glowAmount} />
				</filter>
			</defs>

			{/* The fibre: a sheath, a darker core, and a hair of glint down the middle. */}
			<g className="fibre" opacity={fibreOpacity}>
				<path
					className="fibre-sheath"
					d={pathD}
					strokeWidth={pathWidth + 2}
					strokeLinecap="round"
					style={fibreStyle}
					strokeOpacity={pathColor ? 0.5 : 1}
				/>
				<path
					className="fibre-core"
					d={pathD}
					strokeWidth={pathWidth}
					strokeLinecap="round"
					style={fibreStyle}
				/>
				{!pathColor && (
					<path
						className="fibre-glint"
						d={pathD}
						strokeWidth={Math.max(0.5, pathWidth * 0.3)}
						strokeLinecap="round"
					/>
				)}
			</g>

			{reduced ? (
				/* Still frame: the fibre holds a soft gradient along its length. */
				<g className="still" data-still="">
					<path
						d={pathD}
						stroke={`url(#${id})`}
						strokeWidth={pathWidth * 2.5 + 3}
						strokeLinecap="round"
						opacity={0.35 * glowAmount}
						filter={`url(#${glowId})`}
					/>
					<path
						d={pathD}
						stroke={`url(#${id})`}
						strokeWidth={pathWidth}
						strokeLinecap="round"
						opacity="0.55"
					/>
				</g>
			) : (
				packets.map((packetDelay, i) => (
					<g
						key={i}
						className="packet"
						data-packet={i}
						style={{ "--_delay": `${packetDelay}s` } as CSSProperties}
					>
						{/* Arrival bloom behind the destination node. */}
						<g className="bloom" opacity={0.3 + 0.7 * glowAmount}>
							<circle
								className="bloom-disc"
								cx={landing.x}
								cy={landing.y}
								r={landingRadius + 6}
								style={{ fill: `color-mix(in oklab, ${gradientStopColor} 75%, white)` }}
								filter={`url(#${bloomId})`}
							/>
							<circle
								className="bloom-ring"
								cx={landing.x}
								cy={landing.y}
								r={landingRadius + 4}
								strokeWidth="1"
								style={{ stroke: `color-mix(in oklab, ${gradientStopColor} 55%, white)` }}
							/>
						</g>
						{/* Soft glow, blurred, under the crisp packet. */}
						<g filter={`url(#${glowId})`} opacity={glowAmount}>
							{glows.map((layer, j) => (
								<path
									key={j}
									className="packet-layer"
									d={flowD}
									pathLength={1000}
									strokeWidth={pathWidth * layer.width + 2}
									strokeLinecap="round"
									style={{ ...dashVars(layer), stroke: layer.color } as CSSProperties}
									opacity={layer.opacity}
								/>
							))}
						</g>
						{layers.map((layer, j) => (
							<path
								key={j}
								className={layer.core ? "packet-layer packet-core" : "packet-layer"}
								data-layer={layer.key}
								d={flowD}
								pathLength={1000}
								strokeWidth={pathWidth * layer.width}
								strokeLinecap="round"
								style={
									(layer.core
										? { ...dashVars(layer), "--_core": gradientStartColor }
										: { ...dashVars(layer), stroke: layer.color }) as CSSProperties
								}
								opacity={layer.opacity}
							/>
						))}
					</g>
				))
			)}
		</svg>
	);
}
