import { memo, useMemo, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./text-reveal-stars.css";

/**
 * TextRevealStars - Drifting star field rendered behind the hidden text of
 * TextRevealCard. Each star fades in, scales up and drifts toward a random
 * target position on an infinite loop.
 */
export interface TextRevealStarsProps {
	/** Number of stars to render */
	starsCount?: number;
	/** Additional CSS classes applied to each star */
	className?: string;
	/**
	 * Seed for the star layout. The same seed always produces the same field,
	 * which is what keeps a server render and its hydration identical. Change
	 * it to give two fields on one page different layouts — the default is
	 * shared, so two `<TextRevealStars />` with no seed match.
	 */
	seed?: number;
}

interface StarData {
	top: string;
	left: string;
	targetTop: string;
	targetLeft: string;
	opacity: number;
	duration: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG. `Math.random()` cannot be used
 * here: the layout is computed in the render path, which runs once on the
 * server and again during client hydration, and the two would disagree on
 * every value — a hydration mismatch React may resolve by keeping the SERVER
 * attributes. A seed keeps both renders identical AND keeps the stars in the
 * server markup.
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

function createStars(starsCount: number, seed: number): StarData[] {
	const random = mulberry32(seed);
	const randomMove = () => random() * 4 - 2;
	return Array.from({ length: starsCount }, () => ({
		top: `calc(${random() * 100}% + ${randomMove()}px)`,
		left: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetTop: `calc(${random() * 100}% + ${randomMove()}px)`,
		targetLeft: `calc(${random() * 100}% + ${randomMove()}px)`,
		opacity: random(),
		duration: random() * 10 + 20,
	}));
}

/**
 * Memoised so a pointer scrub over TextRevealCard — which re-renders the card on
 * every mouse/touch move — leaves the star field alone. Without it the whole
 * field (130 spans by default) is re-created and diffed on every pointer event;
 * the star markup only ever depends on `starsCount`, `className` and `seed`.
 */
export const TextRevealStars = memo(function TextRevealStars({
	starsCount = 130,
	className,
	seed = 1,
}: TextRevealStarsProps) {
	// Recomputed only when `starsCount` or `seed` changes — the same dependency
	// the Svelte source's `$derived` tracks. A plain render-time call would
	// reshuffle the field on every unrelated re-render.
	const stars = useMemo(() => createStars(starsCount, seed), [starsCount, seed]);

	return (
		// `text-reveal-stars` is port-added: the CSS anchor class for the
		// compiler-scoped `.star-animate` rule (see text-reveal-stars.css).
		<div className="text-reveal-stars absolute inset-0">
			{stars.map((star, i) => (
				<span
					key={i}
					className={cn(
						"star-animate absolute z-[1] inline-block h-0.5 w-0.5 rounded-full bg-white",
						className
					)}
					style={
						{
							top: star.top,
							left: star.left,
							"--target-top": star.targetTop,
							"--target-left": star.targetLeft,
							"--star-opacity": star.opacity,
							animationDuration: `${star.duration}s`,
						} as CSSProperties
					}
				></span>
			))}
		</div>
	);
});
