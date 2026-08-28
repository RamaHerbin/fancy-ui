import { useMemo, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./meteors.css";

/**
 * Meteors - Animated meteor shower effect
 *
 * Generates N span elements with randomized positions, delays, and durations
 * that animate diagonally across the container.
 */
export interface MeteorsProps {
	/** Number of meteors to render */
	count?: number;
	/** Additional CSS classes applied to each meteor */
	className?: string;
	/**
	 * Seed for the meteor layout. The same seed always produces the same
	 * shower, which is what keeps a server render and its hydration
	 * identical. Change it to give two showers on one page different
	 * layouts — the default is shared, so two `<Meteors />` with no seed
	 * fall the same way.
	 */
	seed?: number;
}

interface Meteor {
	left: string;
	animationDelay: string;
	animationDuration: string;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: the initializer runs once on the server and again during client
 * hydration, and the two would disagree on every value, which React reports
 * as a hydration mismatch and may resolve by keeping the SERVER attributes.
 * Generating after mount instead would fix the mismatch but leave the effect
 * absent from the server HTML; a seed keeps both renders identical AND keeps
 * the shower in the markup.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function createMeteors(count: number, seed: number): Meteor[] {
	const random = mulberry32(seed);
	return Array.from({ length: count }, () => ({
		left: `${Math.floor(random() * 800 - 400)}px`,
		animationDelay: `${(random() * 0.6 + 0.2).toFixed(2)}s`,
		animationDuration: `${Math.floor(random() * 8 + 2)}s`,
	}));
}

export function Meteors({ count = 20, className, seed = 1 }: MeteorsProps) {
	// Recomputed only when `count` or `seed` changes — the same dependencies
	// the Svelte source's `$derived` tracks. A plain render-time call would
	// reshuffle on every unrelated re-render and make the shower jump.
	const meteors = useMemo(() => createMeteors(count, seed), [count, seed]);

	return (
		<>
			{meteors.map((meteor, i) => (
				<span
					key={i}
					className={cn(
						"meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full bg-slate-500 opacity-0 shadow-[0_0_0_1px_#ffffff10]",
						"before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-slate-500 before:to-transparent before:content-['']",
						className
					)}
					style={
						{
							left: meteor.left,
							animationDelay: meteor.animationDelay,
							animationDuration: meteor.animationDuration,
						} as CSSProperties
					}
				/>
			))}
		</>
	);
}
