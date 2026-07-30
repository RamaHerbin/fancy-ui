<script module lang="ts">
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

	const STAR_COUNT = 90;
	/** Arbitrary fixed seed — never change it, or the "same sky every render" guarantee breaks. */
	const STAR_FIELD_SEED = 0x51a2_7547;
	/** Stars only live in the upper band of the layer, above the horizon glow. */
	const STARFIELD_MAX_HEIGHT = 40;

	function generateStars(): Star[] {
		const random = mulberry32(STAR_FIELD_SEED);
		const stars: Star[] = [];
		for (let i = 0; i < STAR_COUNT; i++) {
			stars.push({
				cx: random() * 100,
				cy: random() * STARFIELD_MAX_HEIGHT,
				r: Number((0.7 + random() * 1.3).toFixed(2)),
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
	A single full-bleed SVG, no canvas. Two groups pulse opacity at different,
	unsynchronized periods so the field doesn't read as one blinking mass.

	Deliberately no `viewBox`: a viewBox plus `preserveAspectRatio="none"` would
	stretch the coordinate system to the layer's aspect ratio and blow every
	`<circle>` up into a wide ellipse (~14x9px on a desktop footer). Positions are
	percentages of the box instead, which places them the same way, and the radius
	stays in px so a star stays round at any viewport size.
-->
<svg class="absolute inset-0 h-full w-full" focusable="false" role="presentation">
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
		animation: star-twinkle 3.4s ease-in-out infinite;
	}

	.twinkle-b {
		animation: star-twinkle 5.1s ease-in-out infinite;
		animation-delay: 1.1s;
	}

	@keyframes star-twinkle {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.twinkle-a,
		.twinkle-b {
			animation: none;
			opacity: 0.75;
		}
	}
</style>
