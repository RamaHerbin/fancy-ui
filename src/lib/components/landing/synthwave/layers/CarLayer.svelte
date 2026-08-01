<!--
	Rear 3/4 hero car — moderate size, parked on the grid RIGHT of frame (v2:
	the v1 car was huge and centered; now it reads as one element of the scene,
	not the subject). A small, heavily blurred radial div behind it stands in
	for the RED tail-light glow (no second image); its resting state is fully
	lit for the reduced-motion / no-JS case, and the scene timeline dims it
	down to breathe between CAR_GLOW_MIN_OPACITY and 1.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		CAR,
		CAR_GLOW_MIN_OPACITY,
		CAR_GLOW_PULSE_SECONDS,
		getSceneContext,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources(CAR.asset);
	const fallback = assetFallback(CAR.asset);

	/* Geometry and glow tint flow from scene-config; the CSS below only consumes. */
	const carVars = [
		`--car-width: ${CAR.widthCss}`,
		`--car-left: ${CAR.leftPct}%`,
		`--car-bottom: ${CAR.bottomPct}%`,
		`--car-aspect: ${CAR.aspect}`,
		`--glow-core: rgba(${CAR.glow.coreRGB}, ${CAR.glow.coreAlpha})`,
		`--glow-fringe: rgba(${CAR.glow.fringeRGB}, ${CAR.glow.fringeAlpha})`,
		`--glow-blur: ${CAR.glow.blurPx}px`,
	].join("; ");

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

<div class="absolute inset-0" style={carVars}>
	<div class="car-pos">
		<div bind:this={glowEl} class="tail-glow"></div>
		<picture>
			{#each sources as source (source.type)}
				<!-- The slot is CAR.widthCss (clamp 260px..20vw..390px). -->
				<source type={source.type} srcset={source.srcset} sizes="min(20vw, 390px)" />
			{/each}
			<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
		</picture>
	</div>
</div>

<style>
	.car-pos {
		position: absolute;
		/*
			Left/bottom anchor straight from CAR: plate left edge at 63% of frame
			width (centre ≈ 73% at the 20vw width) and wheels 26% of frame height
			up from the bottom — lifted out of the foreground so the car stands
			in the upper grid band, right of the sun, like the reference.
		*/
		left: var(--car-left);
		bottom: var(--car-bottom);
		width: var(--car-width);
	}

	.car-pos img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--car-aspect);
	}

	.tail-glow {
		position: absolute;
		/*
			Centred behind the plate's tail-light band (the plate carries
			transparent margin; the rear panel sits left-of-centre in it).
		*/
		left: 32%;
		bottom: 20%;
		width: 22%;
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		/* CSS rest state fully lit — the tween only ever dips below this. */
		opacity: 1;
		/*
			RED core → magenta fringe → transparent, from CAR.glow. Roughly half
			the v1 energy: tail lights, not an explosion. The blur is a static
			filter — only opacity ever animates.
		*/
		background: radial-gradient(circle, var(--glow-core), var(--glow-fringe) 55%, transparent 75%);
		filter: blur(var(--glow-blur));
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
