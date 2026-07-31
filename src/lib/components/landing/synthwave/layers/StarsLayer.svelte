<script module lang="ts">
	import { STARFIELD } from "../scene-config.js";

	/**
	 * Deterministic star field: a tiny seeded PRNG (mulberry32) generates the
	 * positions once, when the module first loads, so the sky is identical on
	 * every render and every visitor — no `Math.random` at runtime.
	 */
	function mulberry32(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	interface Star {
		/** Percentage of the layer's width / height. */
		cx: number;
		cy: number;
		/** Radius in px. The SVG carries no viewBox, so user units are CSS px. */
		r: number;
		/** Which twinkle group (and therefore which pulse period) this star joins. */
		twinkle: 1 | 2;
	}

	function generateStars(): Star[] {
		const random = mulberry32(STARFIELD.seed);
		const radiusSpan = STARFIELD.radiusMaxPx - STARFIELD.radiusMinPx;
		const stars: Star[] = [];
		for (let i = 0; i < STARFIELD.count; i++) {
			stars.push({
				cx: random() * 100,
				cy: random() * STARFIELD.maxHeightPct,
				r: Number((STARFIELD.radiusMinPx + random() * radiusSpan).toFixed(2)),
				twinkle: i % 2 === 0 ? 1 : 2,
			});
		}
		return stars;
	}

	const STARS = generateStars();
	const TWINKLE_A = STARS.filter((star) => star.twinkle === 1);
	const TWINKLE_B = STARS.filter((star) => star.twinkle === 2);
</script>

<!--
	A single full-bleed SVG, no canvas. Sparse and dim on purpose: the stars are
	barely-there pinpricks above the sunset haze, not a co-star. Two groups pulse
	opacity at different, unsynchronized periods so the field doesn't read as one
	blinking mass.

	Deliberately no `viewBox`: a viewBox plus `preserveAspectRatio="none"` would
	stretch the coordinate system to the layer's aspect ratio and blow every
	`<circle>` up into a wide ellipse (~14x9px on a desktop footer). Positions are
	percentages of the box instead, which places them the same way, and the radius
	stays in px so a star stays round at any viewport size.
-->
<svg
	class="absolute inset-0 h-full w-full"
	focusable="false"
	role="presentation"
	style={`--twinkle-min: ${STARFIELD.twinkleMinOpacity}; --twinkle-max: ${STARFIELD.twinkleMaxOpacity}; --twinkle-a: ${STARFIELD.twinkleASeconds}s; --twinkle-b: ${STARFIELD.twinkleBSeconds}s; --static-opacity: ${STARFIELD.staticOpacity};`}
>
	<g class="twinkle-a">
		{#each TWINKLE_A as star, i (i)}
			<circle cx="{star.cx}%" cy="{star.cy}%" r={star.r} fill="#ffffff" />
		{/each}
	</g>
	<g class="twinkle-b">
		{#each TWINKLE_B as star, i (i)}
			<circle cx="{star.cx}%" cy="{star.cy}%" r={star.r} fill="#ffffff" />
		{/each}
	</g>
</svg>

<style>
	.twinkle-a {
		animation: star-twinkle var(--twinkle-a) ease-in-out infinite;
	}

	/* The 1.1s offset keeps the two groups from ever starting a pulse together. */
	.twinkle-b {
		animation: star-twinkle var(--twinkle-b) ease-in-out infinite;
		animation-delay: 1.1s;
	}

	@keyframes star-twinkle {
		0%,
		100% {
			opacity: var(--twinkle-min);
		}
		50% {
			opacity: var(--twinkle-max);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.twinkle-a,
		.twinkle-b {
			animation: none;
			opacity: var(--static-opacity);
		}
	}
</style>
