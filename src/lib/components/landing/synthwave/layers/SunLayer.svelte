<!--
	Striped retro sun. Both the disc and its halo are anchored to the same
	`bottom: 48%` line (the source PNG's own bbox has margin around the disc,
	so this reads as the sun sitting into the horizon rather than needing
	pixel-perfect concentricity) and share a horizontal center. The halo is a
	blurred radial div, not part of the raster asset, so it can pulse on its
	own without a second image.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		getSceneContext,
		SUN_HALO_PULSE_SECONDS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources("sun");
	const fallback = assetFallback("sun");

	let haloEl: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: halo holds its static pose

		// `gsap.to` rather than `tl.to`, because a timeline's `.to()` returns the
		// timeline itself — killing that on cleanup would take the whole scene down.
		const tween = gsap.to(haloEl, {
			scale: 1.06,
			yoyo: true,
			repeat: -1,
			duration: SUN_HALO_PULSE_SECONDS,
			ease: "sine.inOut",
		});
		tl.add(tween, 0);

		return () => {
			tween.kill();
			gsap.set(haloEl, { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0">
	<div bind:this={haloEl} class="sun-halo absolute"></div>
	<picture>
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes="min(34vw, 560px)" />
		{/each}
		<img
			src={fallback}
			alt=""
			loading="lazy"
			decoding="async"
			draggable="false"
			class="sun-image absolute"
		/>
	</picture>
</div>

<style>
	.sun-image {
		left: 50%;
		bottom: 48%;
		width: clamp(320px, 34vw, 560px);
		height: auto;
		aspect-ratio: 1280 / 853;
		transform: translateX(-50%);
	}

	.sun-halo {
		--halo-size: clamp(576px, 61.2vw, 1008px);
		left: 50%;
		bottom: 48%;
		width: var(--halo-size);
		/*
			Centred with a negative margin rather than `translateX(-50%)`: GSAP reads
			the existing transform to pulse `scale`, and it resolves that -50% into a
			px offset once, which a viewport resize would then leave frozen off-centre.
		*/
		margin-left: calc(-0.5 * var(--halo-size));
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 140, 60, 0.55),
			rgba(255, 45, 120, 0.35) 45%,
			rgba(255, 45, 120, 0) 72%
		);
		filter: blur(40px);
		/*
			The blur is rasterised once and the compositor scales that texture; without
			the hint every frame of the pulse re-blurs a ~1000px circle.
		*/
		will-change: transform;
	}

	@media (prefers-reduced-motion: reduce) {
		.sun-halo {
			/* No pulse attaches, so don't pay for a promoted layer. */
			will-change: auto;
		}
	}
</style>
