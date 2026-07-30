<!--
	Further-back palm, framing the left edge and partly cropped by it. Sized by
	height (the source is a 1024x1536 portrait render), with `aspect-ratio` on
	the img so width follows automatically. Sways on the scene timeline: a
	`fromTo` yoyo swings it symmetrically around the source's own lean, desynced
	from the front palm by using a different period.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		getSceneContext,
		PALM_BACK_SWAY_SECONDS,
		PALM_SWAY_DEGREES,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources("palm-back");
	const fallback = assetFallback("palm-back");

	let el: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: palm holds its static pose

		// One standalone `gsap.fromTo` added to the master, rather than `tl.set` plus
		// `tl.to`: a timeline's own `.to()` returns the timeline, so killing its
		// result on cleanup would take the whole scene down, and the `set` would
		// outlive the sway it was seeding.
		const tween = gsap.fromTo(
			el,
			{ rotate: -PALM_SWAY_DEGREES },
			{
				rotate: PALM_SWAY_DEGREES,
				yoyo: true,
				repeat: -1,
				duration: PALM_BACK_SWAY_SECONDS,
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
		left: -2%;
		bottom: 45%;
		height: 55%;
		transform-origin: bottom center;
	}

	.palm-pos img {
		display: block;
		height: 100%;
		width: auto;
		aspect-ratio: 1024 / 1536;
	}
</style>
