import { useMemo, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./meteors.css";

/**
 * Meteors - Animated meteor shower effect
 *
 * A seeded field of meteors, each at its own depth: near ones are larger,
 * brighter, longer-tailed and faster, far ones faint and slow, so the
 * shower reads in parallax. Each meteor fades in, streaks across on a
 * diagonal and burns out; a few flare before they go.
 */
export interface MeteorsProps {
	/** Number of meteors to render */
	count?: number;
	/** Additional CSS classes applied to each meteor */
	className?: string;
	/** Direction of travel, in degrees (215 = down and to the right) */
	angle?: number;
	/** Speed multiplier: 2 is twice as fast */
	speed?: number;
	/** Head and tail colour. Defaults to a pale blue-white on dark pages, slate on light ones */
	color?: string;
	/** Seed for the field — same seed, same shower (and the same markup on server and client) */
	seed?: number;
}

export interface Meteor {
	/** Start position, % of the container */
	left: number;
	top: number;
	/** 0 (far) to 1 (near) */
	depth: number;
	/** Seconds for one pass */
	duration: number;
	/** Negative start offset, so the shower is already under way */
	delay: number;
	/** Whether this one flares before it burns out */
	flare: boolean;
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

/**
 * The shower. Starts reach well past the left edge (meteors drift right
 * as they fall, so a start on the left is what fills the left half) and
 * over the upper part of the height; depth skewed toward far, the way a
 * real sky has many faint meteors and few bright ones.
 */
export function meteorField(count: number, seed = 1): Meteor[] {
	const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
	const rand = mulberry32(seed);
	return Array.from({ length: n }, () => {
		const depth = Math.pow(rand(), 1.6);
		const duration = 7 - depth * 4.5 + rand() * 1.5; // near: ~2.5–4s, far: ~7–8.5s
		return {
			left: -50 + rand() * 150,
			top: -30 + rand() * 60,
			depth,
			duration,
			delay: -rand() * duration * 1.6,
			flare: rand() < 0.2,
		};
	});
}

function styleFor(m: Meteor, speed: number, angle: number, color?: string): CSSProperties {
	const scale = 0.55 + m.depth * 0.9; // size of the head
	const tail = Math.round(40 + m.depth * 110); // px
	const brightness = (0.35 + m.depth * 0.65).toFixed(2);
	const style: Record<string, string> = {
		left: `${m.left.toFixed(2)}%`,
		top: `${m.top.toFixed(2)}%`,
		animationDelay: `${(m.delay / speed).toFixed(2)}s`,
		animationDuration: `${(m.duration / speed).toFixed(2)}s`,
		"--meteor-angle": `${angle}deg`,
		"--meteor-scale": scale.toFixed(2),
		"--meteor-tail": `${tail}px`,
		"--meteor-brightness": brightness,
		"--meteor-travel": `${Math.round(700 + m.depth * 500)}px`,
	};
	if (color) style["--meteor-color"] = color;
	return style as CSSProperties;
}

export function Meteors({
	count = 20,
	className,
	angle = 215,
	speed = 1,
	color,
	seed = 1,
}: MeteorsProps) {
	// Recomputed only when `count` or `seed` changes — the same dependencies
	// the Svelte source's `$derived` tracks.
	const meteors = useMemo(() => meteorField(count, seed), [count, seed]);
	const speedC = Number.isFinite(speed) && speed > 0 ? speed : 1;
	const angleC = Number.isFinite(angle) ? angle : 215;

	return (
		<>
			{meteors.map((meteor, i) => (
				<span
					key={i}
					className={cn(
						"meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full opacity-0",
						meteor.flare && "meteor--flare",
						className
					)}
					style={styleFor(meteor, speedC, angleC, color)}
					aria-hidden="true"
				/>
			))}
		</>
	);
}
