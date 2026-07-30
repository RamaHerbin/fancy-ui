<!--
	Closer palm, framing the right edge near the scene floor. Same sizing
	technique as PalmBackLayer (height-driven, aspect-ratio for width) and the
	same `fromTo` sway, at a different period so the two never move in lockstep.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		getSceneContext,
		PALM_FRONT_SWAY_SECONDS,
		PALM_SWAY_DEGREES,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources("palm-front");
	const fallback = assetFallback("palm-front");

	let el: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: palm holds its static pose

		// See PalmBackLayer: standalone tween added to the master, never `tl.to`,
		// whose return value is the timeline and not the tween.
		const tween = gsap.fromTo(
			el,
			{ rotate: -PALM_SWAY_DEGREES },
			{
				rotate: PALM_SWAY_DEGREES,
				yoyo: true,
				repeat: -1,
				duration: PALM_FRONT_SWAY_SECONDS,
				ease: "sine.inOut",
			}
		);
		tl.add(tween, 0);

		return () => {
			tween.kill();
			gsap.set(el, { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0">
	<div bind:this={el} class="palm-pos">
		<picture>
			{#each sources as source (source.type)}
				<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
			{/each}
			<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
		</picture>
	</div>
</div>

<style>
	.palm-pos {
		position: absolute;
		left: 78%;
		bottom: 2%;
		height: 72%;
		transform-origin: bottom center;
	}

	.palm-pos img {
		display: block;
		height: 100%;
		width: auto;
		aspect-ratio: 1024 / 1536;
	}
</style>
