<script module lang="ts">
	import { ATMOSPHERE, SCENE_COLORS, SUN } from "../scene-config.js";

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
		`--fog-violet: ${SCENE_COLORS.violetRGB}`,
		`--grade: rgba(${ATMOSPHERE.gradeRGB}, ${ATMOSPHERE.gradeAlpha})`,
		`--scanline-alpha: ${ATMOSPHERE.scanlineAlpha}`,
		`--vignette-inner: ${ATMOSPHERE.vignette.innerStopPct}%`,
		`--vignette-mid-alpha: ${ATMOSPHERE.vignette.midAlpha}`,
		`--vignette-mid: ${ATMOSPHERE.vignette.midStopPct}%`,
		`--vignette-edge-alpha: ${ATMOSPHERE.vignette.edgeAlpha}`,
		`--sunset-orange: ${SCENE_COLORS.sunsetOrangeRGB}`,
		`--sun-disc-bottom: ${SUN.discBottomPct}%`,
		`--sun-disc-size: ${SUN.discWidthCss}`,
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

	<!-- Warm haze: one huge sun-centred bloom + streaky sunset cloud bands. All static. -->
	<div class="warm-haze"></div>
	<div class="haze-band haze-band-a"></div>
	<div class="haze-band haze-band-b"></div>
	<div class="haze-band haze-band-c"></div>
	<div class="haze-band haze-band-d"></div>
	<div class="sun-bloom"></div>

	<!-- Particles: rising embers/dust, pure CSS keyframes, staggered per dot. -->
	{#each PARTICLES as particle, i (i)}
		<span
			class="particle"
			style={`left: ${particle.left}%; width: ${particle.size}px; height: ${particle.size}px; background: ${particle.color}; --duration: ${particle.duration}s; --delay: ${particle.delay}s;`}
		></span>
	{/each}

	<!-- Grade wash + scanlines + vignette: static, cheap, grading the whole scene. -->
	<div class="grade"></div>
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
			rgba(var(--fog-magenta), 0.3),
			rgba(var(--fog-magenta), 0) 70%
		);
	}

	/* Violet is accent-only in the new grade — one dim blob, never dominant. */
	.fog-right {
		right: -10%;
		background: radial-gradient(
			ellipse at center,
			rgba(var(--fog-violet), 0.22),
			rgba(var(--fog-violet), 0) 70%
		);
	}

	/*
		Warm bloom on the sun's spot. This layer stacks frontmost, so "behind the
		sun" is faked with screen blending: it can only brighten, so the striped
		disc stays readable through it and the glow reads as sitting behind.
		Centring mirrors the sun halo's anchors: the disc bottom pins to the
		--sun-disc-bottom line, and the extra half disc-size in the translate
		lifts this box's centre from that line up to the disc's centre.
	*/
	.sun-bloom {
		position: absolute;
		left: 50%;
		top: var(--sun-disc-bottom);
		width: calc(2 * var(--sun-disc-size));
		aspect-ratio: 1 / 1;
		transform: translate(-50%, calc(-50% - 0.5 * var(--sun-disc-size)));
		background: radial-gradient(
			circle,
			rgba(var(--sunset-orange), 0.35),
			rgba(var(--sunset-orange), 0) 60%
		);
		mix-blend-mode: screen;
	}

	/*
		The mock's warm haze: one huge orange bloom radiating from the sun into the
		surrounding sky, far wider than the tight disc bloom below. The radius is
		fixed (55vw) rather than box-relative, so the falloff matches the mock at
		any frame height. Screen blending, same rationale as .sun-bloom: it can
		only brighten, warming the cool purple without fogging the blacks. The
		orange is a mock-measured haze value, not a scene-config token.
	*/
	.warm-haze {
		position: absolute;
		left: 50%;
		top: var(--sun-disc-bottom);
		width: 110vw;
		aspect-ratio: 1 / 1;
		transform: translate(-50%, calc(-50% - 0.5 * var(--sun-disc-size)));
		background: radial-gradient(
			circle 55vw at center,
			rgba(255, 140, 60, 0.28),
			rgba(255, 140, 60, 0) 100%
		);
		mix-blend-mode: screen;
	}

	/*
		Horizontal haze streaks across the sky — the mock's sunset cloud bands,
		spread from the upper sky (~22%) down to the horizon glow (~54%). The pink
		and per-band alpha are band-local (not scene-config tokens). Each band
		fades to transparent inside its own box, so none needs the parallax bleed
		spread.
	*/
	.haze-band {
		position: absolute;
		height: 2vh;
		--haze-pink: 255, 90, 140;
		filter: blur(12px);
		background: linear-gradient(
			90deg,
			rgba(var(--haze-pink), 0) 0%,
			rgba(var(--haze-pink), var(--band-alpha)) 22%,
			rgba(var(--haze-pink), var(--band-alpha)) 78%,
			rgba(var(--haze-pink), 0) 100%
		);
	}

	.haze-band-a {
		top: 22.5%;
		left: 12%;
		right: 26%;
		--band-alpha: 0.15;
	}

	.haze-band-b {
		top: 33%;
		left: 22%;
		right: 6%;
		height: 2.5vh;
		--band-alpha: 0.19;
	}

	.haze-band-c {
		top: 44%;
		left: 6%;
		right: 14%;
		height: 3vh;
		--band-alpha: 0.25;
	}

	.haze-band-d {
		top: 52.5%;
		left: 16%;
		right: 10%;
		--band-alpha: 0.2;
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
		The three framing overlays spread into the scene's parallax bleed: they are
		the only hard-edged full-bleed boxes in this layer, and the layer still
		drifts a few px with the pointer, which would otherwise pull the vignette's
		dark rim away from one side of the frame.
	*/

	/* The "saturation toward magenta" pass — one flat wash over the whole frame. */
	.grade {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: var(--grade);
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
		Heavy pooled-darkness corners, per the mock. The ellipse is centred slightly
		above mid-frame so the bottom edge darkens fastest — that is where the
		footer links sit and where the scene hands off to the page.
	*/
	.vignette {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: radial-gradient(
			ellipse 130% 105% at 50% 42%,
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
