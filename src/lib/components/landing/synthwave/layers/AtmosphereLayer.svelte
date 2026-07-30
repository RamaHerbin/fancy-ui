<script module lang="ts">
	interface ParticleConfig {
		left: number;
		duration: number;
		delay: number;
		size: number;
		color: string;
	}

	const PARTICLE_COUNT = 14;

	/**
	 * Deterministic per-index spread — no RNG needed for 14 dots. 71 shares no
	 * small factor with 100, so `(i * 71) % 100` walks the width without an
	 * obvious repeating pattern.
	 */
	function generateParticles(): ParticleConfig[] {
		return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
			left: (i * 71) % 100,
			duration: 9 + (i % 8), // 9s..16s
			delay: Number((i * 0.8).toFixed(2)),
			size: i % 2 === 0 ? 2 : 3,
			color: i % 3 === 0 ? "#ffffff" : "#ff2d78",
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

<div class="absolute inset-0">
	<!-- Fog: two blurred haze blobs drifting apart, attached to the scene timeline. -->
	<div bind:this={fogLeftEl} class="fog fog-left"></div>
	<div bind:this={fogRightEl} class="fog fog-right"></div>

	<!-- Particles: rising embers/dust, pure CSS keyframes, staggered per dot. -->
	{#each PARTICLES as particle, i (i)}
		<span
			class="particle"
			style={`left: ${particle.left}%; width: ${particle.size}px; height: ${particle.size}px; background: ${particle.color}; --duration: ${particle.duration}s; --delay: ${particle.delay}s;`}
		></span>
	{/each}

	<!-- Scanlines + vignette: static, cheap, framing the whole scene. -->
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
			rgba(255, 45, 120, 0.35),
			rgba(255, 45, 120, 0) 70%
		);
	}

	.fog-right {
		right: -10%;
		background: radial-gradient(
			ellipse at center,
			rgba(191, 95, 255, 0.3),
			rgba(191, 95, 255, 0) 70%
		);
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
		Both framing overlays spread into the scene's parallax bleed: they are the
		only hard-edged full-bleed boxes in this layer, and the layer still drifts a
		few px with the pointer, which would otherwise pull the vignette's dark rim
		away from one side of the frame.
	*/
	.scanlines {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: repeating-linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.04) 0px,
			rgba(255, 255, 255, 0.04) 1px,
			rgba(255, 255, 255, 0) 1px,
			rgba(255, 255, 255, 0) 3px
		);
	}

	.vignette {
		position: absolute;
		inset: calc(-1 * var(--parallax-bleed-y, 0px)) calc(-1 * var(--parallax-bleed-x, 0px));
		background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.55) 100%);
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
