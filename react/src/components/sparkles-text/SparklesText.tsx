import { useEffect, useState, type CSSProperties } from "react";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";
import "./sparkles-text.css";

/**
 * SparklesText - Text with animated sparkle stars
 *
 * Renders text with SVG sparkle stars overlaid that animate with
 * fade/scale/rotation effects. Sparkles regenerate periodically.
 */
export interface SparklesTextProps {
	/** Text to display */
	text: string;
	/** Number of sparkle stars */
	sparklesCount?: number;
	/** Two colors for sparkle stars */
	colors?: { first: string; second: string };
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the sparkle field. The same seed always produces the same
	 * initial field, which is what keeps a server render and its hydration
	 * identical. Change it to give two fields on one page different layouts —
	 * the default is shared, so two `<SparklesText />` with no seed start
	 * with the same field.
	 */
	seed?: number;
}

interface Sparkle {
	id: string;
	x: string;
	y: string;
	color: string;
	delay: number;
	scale: number;
	lifespan: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: the initializer runs once on the server and again during client
 * hydration, and the two would disagree on every value, which React reports
 * as a hydration mismatch and may resolve by keeping the SERVER attributes.
 * A seed keeps both renders identical AND keeps the sparkles in the markup.
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

function generateStar(
	random: () => number,
	colors: { first: string; second: string }
): Sparkle {
	const x = `${random() * 100}%`;
	const y = `${random() * 100}%`;
	const color = random() > 0.5 ? colors.first : colors.second;
	const delay = random() * 2;
	const scale = random() * 1 + 0.3;
	const lifespan = random() * 10 + 5;
	// The source ids in `Date.now()` plus a `Math.random()` draw; both are
	// forbidden in a render path, so the id takes another PRNG draw instead —
	// still unique within a field for keying purposes.
	const id = `${x}-${y}-${random()}`;
	return { id, x, y, color, delay, scale, lifespan };
}

export function SparklesText({
	text,
	sparklesCount = 10,
	colors = { first: "#9E7AFF", second: "#FE8BBB" },
	className,
	seed = 1,
}: SparklesTextProps) {
	// Initialized once at mount, like the source's `initializeStars()` call at
	// component init — a later `sparklesCount` change does not regenerate the
	// field there either. The lazy initializer builds its own PRNG stream, so
	// it is pure and produces the same field on the server and on hydration.
	const [sparkles, setSparkles] = useState<Sparkle[]>(() => {
		const random = mulberry32(seed);
		return Array.from({ length: sparklesCount }, () => generateStar(random, colors));
	});

	// Regenerated stars read the CURRENT colors, as the source's reactive
	// closure does, without restarting the interval when colors change.
	const colorsRef = useLiveRef(colors);

	useEffect(() => {
		// Regeneration happens only after mount, so it never has to agree with
		// the server; a second seeded stream keeps it deterministic anyway.
		const random = mulberry32(seed + 1);
		const intervalId = setInterval(() => {
			setSparkles((prev) =>
				prev.map((star) => {
					if (star.lifespan <= 0) {
						return generateStar(random, colorsRef.current);
					}
					return { ...star, lifespan: star.lifespan - 0.1 };
				})
			);
		}, 100);
		return () => clearInterval(intervalId);
	}, [seed]);

	return (
		<div className={cn("sparkles-text text-6xl font-bold", className)}>
			<span className="relative inline-block">
				{sparkles.map((sparkle) => (
					<svg
						key={sparkle.id}
						className="sparkles-star pointer-events-none absolute z-20"
						style={
							{
								left: sparkle.x,
								top: sparkle.y,
								"--sparkle-scale": `${sparkle.scale}`,
								animation: `sparkleAnim 0.8s ease-in-out ${sparkle.delay}s infinite`,
								transform: "scale(0) rotate(75deg)",
								opacity: 0,
							} as CSSProperties
						}
						width="21"
						height="21"
						viewBox="0 0 21 21"
					>
						<path
							d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
							fill={sparkle.color}
						/>
					</svg>
				))}
				{text}
			</span>
		</div>
	);
}
