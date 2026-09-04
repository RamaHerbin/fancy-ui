import { memo, useMemo, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./star-field.css";

export interface StarFieldProps {
	/** Number of stars to render */
	starsCount?: number;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Seed for the star layout. The same seed always produces the same sky,
	 * which is what keeps a server render and its hydration identical. Change
	 * it to give two star fields on one page different layouts — the default
	 * is shared, so two `<StarField />` with no seed twinkle the same way.
	 */
	seed?: number;
}

interface Star {
	id: number;
	top: string;
	left: string;
	size: number;
	twinkleDuration: number;
	driftDuration: number;
	driftDirection: number;
	opacityStart: number;
	opacityEnd: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: the star list is built in the render path, so it would run once on
 * the server and again during client hydration, and the two would disagree
 * on every value — a hydration mismatch React may resolve by keeping the
 * SERVER attributes. A seed keeps both renders identical AND keeps the sky
 * in the markup.
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

function createStars(starsCount: number, seed: number): Star[] {
	const rng = mulberry32(seed);

	function random(min: number, max: number): number {
		return rng() * (max - min) + min;
	}

	function randomSize(): number {
		return rng() < 0.5 ? 1 : 2;
	}

	return Array.from(
		{ length: starsCount },
		(_, i): Star => ({
			id: i,
			top: `${random(0, 100)}%`,
			left: `${random(0, 100)}%`,
			size: randomSize(),
			twinkleDuration: random(2, 4),
			driftDuration: random(5, 10),
			driftDirection: random(-50, 50),
			opacityStart: random(0.1, 0.3),
			opacityEnd: random(0.7, 1),
		})
	);
}

/**
 * Memoised, because the sky is a constant and its host is not: Compare
 * re-renders on every autoplay frame and every pointer move while it passes
 * this component nothing but static literals. Without the boundary each of
 * those frames would rebuild every star element and diff its inline style to
 * write nothing — work the Svelte source never does, where the `{#each}` block
 * is built once and only the divider's own two style properties change.
 */
export const StarField = memo(function StarField({
	starsCount = 130,
	className,
	seed = 1,
}: StarFieldProps) {
	// Generated once per (starsCount, seed) — the Svelte source builds the
	// list once at component creation; recomputing on unrelated re-renders
	// would reshuffle the sky.
	const stars = useMemo(() => createStars(starsCount, seed), [starsCount, seed]);

	return (
		<div className={cn("fancy-star-field absolute inset-0 overflow-hidden", className)}>
			{stars.map((star) => (
				<div
					key={star.id}
					className="star absolute rounded-full bg-white"
					style={
						{
							top: star.top,
							left: star.left,
							width: `${star.size}px`,
							height: `${star.size}px`,
							"--fancy-ui-twinkle-duration": `${star.twinkleDuration}s`,
							"--fancy-ui-drift-duration": `${star.driftDuration}s`,
							"--fancy-ui-drift-direction": `${star.driftDirection}px`,
							"--fancy-ui-opacity-start": star.opacityStart,
							"--fancy-ui-opacity-end": star.opacityEnd,
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
});
