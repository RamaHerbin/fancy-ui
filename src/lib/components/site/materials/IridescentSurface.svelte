<!--
	IridescentSurface — the hero text's petrol film scaled up to a panel. Same
	four layers (petrol.css), but seen as a smoked oil, not a flag: the rings
	are drawn so large that the ink-slate pool is a dark region of the surface
	(about 30 %) with one period of colour around it, the colour is muted
	(under a smoke tint) and the edges sink into the canvas under
	an inset vignette. Drift is slower than the text's (17–28 s loops). Pure
	CSS; purely decorative; static under reduced motion and `paused`.
-->
<script lang="ts">
	import { rimSeed } from "./rim.js";
	import "./petrol.css";

	interface Props {
		/** Shifts each loop's phase so neighbouring surfaces differ. */
		seed?: number;
		/** Freeze the film on its current frame. */
		paused?: boolean;
		class?: string;
	}

	let { seed = 0, paused = false, class: className = "" }: Props = $props();

	// Loop periods (x, y, swirl, scale), all ≥ 16 s and incommensurate.
	const PERIODS = [22, 17, 28, 19];
	// Negative delays start each loop at a seeded point of its cycle, so two
	// surfaces never show the same frame; the rest frame stays the shared one.
	const offset = $derived(rimSeed(seed).start / 360);
	const delays = $derived(PERIODS.map((p) => `${(-offset * p).toFixed(2)}s`).join(", "));
</script>

<div
	class="surface fx-petrol {className}"
	aria-hidden="true"
	data-decorative
	data-paused={paused || undefined}
	style:animation-delay={delays}
></div>

<style>
	.surface {
		/* Pool radius ≈ 13 % of rx: ~135×80 px, about 30 % of a 437×273 panel,
		   kept on the surface by the surface's own centre path below. */
		--pf-rx: 1000px;
		--pf-ry: 600px;
		/* Rest frame (reduced motion): the pool at the left, rings as arcs. */
		--pf-x: 24%;
		--pf-y: 62%;
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: 20px;
		background-color: var(--fx-card-raised, #15151a);
		/* The static displaced texture (layer 3) is sized for glyphs; stretched
		   over a panel it reads as vertical stripes, so it is dropped here. */
		background-size:
			180% 100%,
			100% 100%,
			0 0,
			100% 100%;
		animation-name: surface-pf-x, surface-pf-y, fx-pf-a, fx-pf-s;
		animation-duration: 22s, 17s, 28s, 19s;
	}

	/* The pool drifts along the left third, so the rings cross the panel as
	   arcs instead of a centred target. */
	@keyframes surface-pf-x {
		from {
			--pf-x: 16%;
		}
		to {
			--pf-x: 34%;
		}
	}

	@keyframes surface-pf-y {
		from {
			--pf-y: 52%;
		}
		to {
			--pf-y: 74%;
		}
	}

	/* Smoke + a soft silver highlight band + the vignette toward the canvas. */
	.surface::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background:
			linear-gradient(
				118deg,
				transparent 34%,
				rgb(230 232 238 / 0.1) 46%,
				rgb(230 232 238 / 0.16) 50%,
				rgb(230 232 238 / 0.1) 54%,
				transparent 66%
			),
			/* Vignette as a gradient, not a large blurred inset shadow: Chromium
			   draws those as a nine-patch and the seams show on a bright film. */
			radial-gradient(
					ellipse 72% 78% at 50% 50%,
					transparent 40%,
					rgb(9 9 11 / 0.55) 75%,
					rgb(9 9 11 / 0.9) 100%
				),
			rgb(21 21 26 / 0.38);
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}
</style>
