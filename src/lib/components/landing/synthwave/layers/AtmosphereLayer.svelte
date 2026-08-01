<script module lang="ts">
	import {
		ATMOSPHERE,
		SCENE_COLORS,
		SCENE_GRADE,
		SCENE_HORIZON_PCT,
		SUN,
	} from "../scene-config.js";

	interface ParticleConfig {
		left: number;
		duration: number;
		delay: number;
		size: number;
		color: string;
	}

	/**
	 * Deterministic per-index spread — no RNG needed for a handful of dots. 71
	 * shares no small factor with 100, so `(i * 71) % 100` walks the width
	 * without an obvious repeating pattern.
	 */
	function generateParticles(): ParticleConfig[] {
		return Array.from({ length: ATMOSPHERE.particleCount }, (_, i) => ({
			left: (i * 71) % 100,
			duration: 9 + (i % 8), // 9s..16s
			delay: Number((i * 0.8).toFixed(2)),
			size: i % 2 === 0 ? 2 : 3,
			color: i % 3 === 0 ? "#ffffff" : "#ff5a9e",
		}));
	}

	const PARTICLES = generateParticles();
</script>

<script lang="ts">
	import { gsap } from "gsap";
	import { FOG_DRIFT_SECONDS, getSceneContext } from "../scene-config.js";

	const scene = getSceneContext();

	let fogLeftEl: HTMLDivElement;
	let fogRightEl: HTMLDivElement;

	/**
	 * Every color/alpha the config owns, handed to the CSS as custom properties
	 * so the stylesheet below never re-hardcodes a value scene-config carries.
	 */
	const styleVars = [
		`--fog-magenta: ${SCENE_COLORS.magentaBrightRGB}`,
		`--fog-magenta-alpha: ${ATMOSPHERE.fogLeftAlpha}`,
		`--fog-violet: ${SCENE_COLORS.violetRGB}`,
		`--fog-violet-alpha: ${ATMOSPHERE.fogRightAlpha}`,
		`--exposure: rgba(${SCENE_GRADE.exposureRGB}, ${SCENE_GRADE.exposureAlpha})`,
		`--saturation-wash: rgba(${SCENE_GRADE.saturationRGB}, ${SCENE_GRADE.saturationAlpha})`,
		`--scanline-alpha: ${ATMOSPHERE.scanlineAlpha}`,
		`--vignette-center: ${SCENE_GRADE.vignette.centerXPct}% ${SCENE_GRADE.vignette.centerYPct}%`,
		`--vignette-inner: ${SCENE_GRADE.vignette.innerStopPct}%`,
		`--vignette-mid-alpha: ${SCENE_GRADE.vignette.midAlpha}`,
		`--vignette-mid: ${SCENE_GRADE.vignette.midStopPct}%`,
		`--vignette-edge-alpha: ${SCENE_GRADE.vignette.edgeAlpha}`,
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		// Bloom width derives from the sun disc token (~1.6x the disc) so the
		// two stay proportioned if the art director resizes the sun.
		`--horizon-bloom-width: calc(1.6 * ${SUN.discWidthCss})`,
		`--horizon-bloom-orange: rgba(${SCENE_COLORS.sunsetOrangeRGB}, 0.3)`,
		`--horizon-bloom-pink: rgba(${SCENE_COLORS.magentaBrightRGB}, 0.14)`,
		// Cloud streaks hang off the sun disc's own geometry so they track the
		// disc if the art director resizes or re-seats it.
		`--sun-disc-width: ${SUN.discWidthCss}`,
		`--sun-disc-bottom: ${SUN.discBottomPct}%`,
	].join("; ");

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: fog holds its static pose

		// Standalone tweens added to the master, never `tl.to`, whose return value is
		// the timeline itself — killing that on cleanup would take the whole scene
		// down, every other layer's tweens included.
		const tweens = [
			gsap.to(fogLeftEl, {
				xPercent: 4,
				yoyo: true,
				repeat: -1,
				duration: FOG_DRIFT_SECONDS,
				ease: "sine.inOut",
			}),
			gsap.to(fogRightEl, {
				xPercent: -4,
				yoyo: true,
				repeat: -1,
				duration: FOG_DRIFT_SECONDS,
				ease: "sine.inOut",
			}),
		];
		for (const tween of tweens) tl.add(tween, 0);

		return () => {
			for (const tween of tweens) tween.kill();
			gsap.set([fogLeftEl, fogRightEl], { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0" style={styleVars}>
	<!-- Fog: two blurred haze blobs drifting apart, attached to the scene timeline. -->
	<div bind:this={fogLeftEl} class="fog fog-left"></div>
	<div bind:this={fogRightEl} class="fog fog-right"></div>

	<!--
		Edge falloff, painted over the fog but UNDER the horizon bloom so the
		bloom keeps its full strength: pulls the sky's outer fifth down to
		near-black, leaving the light pooled on the sun.
	-->
	<div class="sun-falloff"></div>

	<!--
		Horizon bloom: warm concentrated light hugging the waterline behind the
		sun. Scene light, not grade — it sits before the exposure/vignette divs
		so the grade still pulls it down and the corners stay crushed.
	-->
	<div class="horizon-bloom"></div>

	<!--
		Cloud streaks: four dark-crimson wisps hugging the sun's upper half, per
		the reference — thin elongated horizontal clouds crossing the disc and
		trailing off to each side. Irregular on purpose: varying length,
		thickness, lateral offset, and vertical gaps, so they read as weather,
		not as echoes of the disc's own internal bands. Static decoration.
	-->
	<div class="cloud-streak streak-1"></div>
	<div class="cloud-streak streak-2"></div>
	<div class="cloud-streak streak-3"></div>
	<div class="cloud-streak streak-4"></div>

	<!-- Particles: rising embers/dust, pure CSS keyframes, staggered per dot. -->
	{#each PARTICLES as particle, i (i)}
		<span
			class="particle"
			style={`left: ${particle.left}%; width: ${particle.size}px; height: ${particle.size}px; background: ${particle.color}; --duration: ${particle.duration}s; --delay: ${particle.delay}s;`}
		></span>
	{/each}

	<!--
		The v2 global grade, painted back to front: exposure pull-down, residual
		saturation wash, scanlines, then the vignette LAST so black stays black.
		All static divs — no backdrop-filter, it is too expensive full-bleed.
	-->
	<div class="exposure"></div>
	<div class="saturation-wash"></div>
	<div class="scanlines"></div>
	<div class="vignette"></div>
</div>

<style>
	.fog {
		position: absolute;
		top: 40%;
		width: 70%;
		height: 26%;
		border-radius: 50%;
		filter: blur(48px);
		/*
			The drift is a pure translation, so the 48px blur can be rasterised once and
			moved by the compositor. Without the hint the browser re-blurs a ~1000px
			box every frame of a 24s tween.
		*/
		will-change: transform;
	}

	.fog-left {
		left: -10%;
		background: radial-gradient(
			ellipse at center,
			rgba(var(--fog-magenta), var(--fog-magenta-alpha)),
			rgba(var(--fog-magenta), 0) 70%
		);
	}

	/* Violet is accent-only in the v2 grade — one dim blob, never dominant. */
	.fog-right {
		right: -10%;
		background: radial-gradient(
			ellipse at center,
			rgba(var(--fog-violet), var(--fog-violet-alpha)),
			rgba(var(--fog-violet), 0) 70%
		);
	}

	/*
		A tight orange-pink ellipse centred on the waterline, ~1.6x the sun disc
		wide. 320px tall and transparent by 70% of its radius: the glow dies
		~112px from the waterline (+30px blur ≈ 145px), comfortably inside the
		180px budget above the horizon — concentrated light, never a sky wash.
		Static: no animation, nothing to gate under reduced motion.
	*/
	.horizon-bloom {
		position: absolute;
		left: 50%;
		top: var(--horizon);
		width: var(--horizon-bloom-width);
		height: 320px;
		transform: translate(-50%, -50%);
		background: radial-gradient(
			ellipse at center,
			var(--horizon-bloom-orange),
			var(--horizon-bloom-pink) 45%,
			transparent 70%
		);
		filter: blur(30px);
	}

	/*
		Edge falloff. The sky wash held roughly its full brightness all the way
		out to the frame edges, where the reference has already fallen to
		near-black — the global vignette below cannot fix that on its own,
		because its ellipse is 120% of the frame wide, so the left/right edges
		sit only ~42% along its radius and pick up barely a fifth of its
		darkening.

		So: a second ellipse, this one only 52% of the frame wide and centred on
		the sun rather than above it, which puts the frame edges at ~96% of its
		radius. Transparent out to 34% of that radius — a pocket wider than the
		sun disc and the horizon bloom both, so neither dims — then a ramp to
		#14001e (20, 0, 30, the near-black plum the reference sits at) that has
		the outer tenth of the width essentially there and the outer fifth well
		down. Tall (140%) so the falloff is driven by horizontal distance and
		the sky directly above the sun stays open.

		Local calibration, like SkyLayer's own edge vignette: the config carries
		no falloff numbers, and SCENE_GRADE.vignette is the separate global pass
		applied at the very end of this layer.
	*/
	.sun-falloff {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: radial-gradient(
			ellipse 52% 140% at 50% var(--horizon),
			transparent 34%,
			rgba(20, 0, 30, 0.38) 56%,
			rgba(20, 0, 30, 0.78) 74%,
			rgba(20, 0, 30, 0.92) 92%
		);
	}

	/*
		Dark-crimson cloud wisps across the sun's upper half. The disc is a
		circle, so its height equals --sun-disc-width: each streak's top offset
		is a fraction of that width above the disc's bottom edge (0.5 = the
		disc's midline, 1.0 = its top). Fractions and gaps are deliberately
		uneven, and each streak is nudged sideways so none aligns with the
		plate's internal scanline bands.

		The four share one profile and differ only by the numbers below —
		length, thickness, lateral shift, strength, and how much of each end
		dissolves. Lengths stay short: the reference clusters its wisps around
		the sun rather than running them across the frame, so no streak reaches
		further than ~1.2 disc widths from the sun's centre (half-width plus
		shift), which also keeps them clear of the palms.

		The color is scene weather, not a palette accent, so it is local to
		this layer rather than a SCENE_COLORS token.
	*/
	.cloud-streak {
		position: absolute;
		left: 50%;
		border-radius: 9999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(122, 16, 48, 0.6) 20%,
			rgba(122, 16, 48, 1) 50%,
			rgba(122, 16, 48, 0.72) 76%,
			transparent 100%
		);
		/*
			The gradient alone still let a visible end land on the box edge. The
			mask drives alpha to zero across the outer --feather of each end
			whatever the paint does underneath, so no streak can terminate on a
			square end.
		*/
		-webkit-mask-image: linear-gradient(
			90deg,
			transparent 0%,
			#000 var(--feather),
			#000 calc(100% - var(--feather)),
			transparent 100%
		);
		mask-image: linear-gradient(
			90deg,
			transparent 0%,
			#000 var(--feather),
			#000 calc(100% - var(--feather)),
			transparent 100%
		);
		/* Softens the long edges too — a 2px wisp with a crisp rule reads as a bar. */
		filter: blur(var(--soften));
	}

	.streak-1 {
		top: calc(var(--sun-disc-bottom) - 0.94 * var(--sun-disc-width));
		width: calc(var(--sun-disc-width) + 120px);
		height: 3px;
		transform: translateX(calc(-50% + 34px));
		opacity: 0.3;
		--feather: 18%;
		--soften: 0.7px;
	}

	.streak-2 {
		top: calc(var(--sun-disc-bottom) - 0.8 * var(--sun-disc-width));
		width: calc(var(--sun-disc-width) + 260px);
		height: 7px;
		transform: translateX(calc(-50% - 18px));
		opacity: 0.42;
		--feather: 16%;
		--soften: 1.1px;
	}

	.streak-3 {
		top: calc(var(--sun-disc-bottom) - 0.67 * var(--sun-disc-width));
		width: calc(var(--sun-disc-width) + 70px);
		height: 2px;
		transform: translateX(calc(-50% + 62px));
		opacity: 0.26;
		--feather: 20%;
		--soften: 0.5px;
	}

	.streak-4 {
		top: calc(var(--sun-disc-bottom) - 0.55 * var(--sun-disc-width));
		width: calc(var(--sun-disc-width) + 190px);
		height: 5px;
		transform: translateX(calc(-50% - 40px));
		opacity: 0.36;
		--feather: 17%;
		--soften: 0.9px;
	}

	.particle {
		position: absolute;
		bottom: 8%;
		border-radius: 9999px;
		filter: blur(1px);
		animation: particle-rise var(--duration) ease-in-out var(--delay) infinite;
	}

	@keyframes particle-rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		15% {
			opacity: 0.85;
		}
		85% {
			opacity: 0.5;
		}
		100% {
			transform: translateY(-160px);
			opacity: 0;
		}
	}

	/*
		The grade overlays spread into the scene's parallax bleed: they are the
		only hard-edged full-bleed boxes in this layer, and the layer still
		drifts a few px with the pointer, which would otherwise pull the vignette's
		dark rim away from one side of the frame.
	*/

	/*
		Uniform exposure pull-down — the "everything darker" pass. Bright accents
		(sun, lines, city neon) start hot enough to survive it; the v1 haze
		fields sink into black.
	*/
	.exposure {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: var(--exposure);
	}

	/* The residual magenta tint — one flat trace wash so the grade leans warm. */
	.saturation-wash {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: var(--saturation-wash);
	}

	.scanlines {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: repeating-linear-gradient(
			to bottom,
			rgba(255, 255, 255, var(--scanline-alpha)) 0px,
			rgba(255, 255, 255, var(--scanline-alpha)) 1px,
			rgba(255, 255, 255, 0) 1px,
			rgba(255, 255, 255, 0) 3px
		);
	}

	/*
		The strongest tool in the v2 kit: centred on the sun so light stays
		pooled around the disc while the corners crush to black, per the
		reference's dark framing.
	*/
	.vignette {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: radial-gradient(
			ellipse 120% 100% at var(--vignette-center),
			transparent var(--vignette-inner),
			rgba(0, 0, 0, var(--vignette-mid-alpha)) var(--vignette-mid),
			rgba(0, 0, 0, var(--vignette-edge-alpha)) 100%
		);
	}

	@media (prefers-reduced-motion: reduce) {
		.particle {
			animation: none;
			opacity: 0.6;
		}

		.fog {
			/* No drift attaches, so don't pay for a promoted layer. */
			will-change: auto;
		}
	}
</style>
