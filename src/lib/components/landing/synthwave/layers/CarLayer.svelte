<!--
	Rear 3/4 car, right-of-center on the scene floor. A small, heavily blurred
	radial div behind it stands in for the tail-light glow (no second image);
	its resting state is fully lit for the reduced-motion / no-JS case, and the
	scene timeline dims it down to breathe between 0.75 and 1 opacity.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		CAR_GLOW_MIN_OPACITY,
		CAR_GLOW_PULSE_SECONDS,
		getSceneContext,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources("car");
	const fallback = assetFallback("car");

	let glowEl: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: glow holds its static, fully-lit pose

		// A standalone `gsap.fromTo` added to the master, never `tl.set` + `tl.to`:
		// a timeline's `.to()` returns the timeline, so killing its result would take
		// the whole scene down with it.
		const tween = gsap.fromTo(
			glowEl,
			{ opacity: CAR_GLOW_MIN_OPACITY },
			{
				opacity: 1,
				yoyo: true,
				repeat: -1,
				duration: CAR_GLOW_PULSE_SECONDS,
				ease: "sine.inOut",
			}
		);
		tl.add(tween, 0);

		return () => {
			tween.kill();
			// Back to the CSS rest state: fully lit.
			gsap.set(glowEl, { clearProps: "opacity" });
		};
	});
</script>

<div class="absolute inset-0">
	<div class="car-pos">
		<div bind:this={glowEl} class="tail-glow"></div>
		<picture>
			{#each sources as source (source.type)}
				<source type={source.type} srcset={source.srcset} sizes="min(30vw, 520px)" />
			{/each}
			<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
		</picture>
	</div>
</div>

<style>
	.car-pos {
		position: absolute;
		left: 60%;
		/*
			The footer's bg-black/70 scrim covers roughly the bottom third of the
			section: anything below ~34% sits behind it. The car parks on the
			visible stretch of grid between the horizon and the scrim line.
		*/
		bottom: 34%;
		width: clamp(240px, 22vw, 400px);
	}

	.car-pos img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1280 / 853;
	}

	.tail-glow {
		position: absolute;
		left: 32%;
		bottom: 20%;
		width: 22%;
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		opacity: 1;
		background: radial-gradient(
			circle,
			rgba(255, 80, 40, 0.85),
			rgba(255, 45, 120, 0.4) 55%,
			rgba(255, 45, 120, 0) 75%
		);
		filter: blur(18px);
		/* Keeps the breath on the compositor instead of re-blurring every frame. */
		will-change: opacity;
	}

	@media (prefers-reduced-motion: reduce) {
		.tail-glow {
			/* No breath attaches, so don't pay for a promoted layer. */
			will-change: auto;
		}
	}
</style>
