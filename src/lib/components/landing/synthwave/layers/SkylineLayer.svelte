<!--
	Distant neon city on the horizon's right — small on purpose, it reads as
	kilometres away. The plate's base is flush with the image's own bottom edge
	(zero bottom padding), so `top: var(--horizon)` + `translate(-50%, -100%)`
	— percentages of the element's own box — puts the building bases exactly on
	the horizon at any viewport. A mirrored, squashed, faded second copy below
	the horizon is the wet-floor reflection: same texture, one extra img.

	All geometry comes from CITY in scene-config; this file adds no geometry
	numbers of its own. The window-light dot placement below is the one local
	detail: fixed-pixel neon dots masked by the plate's own alpha, so every dot
	lands on a building at any viewport scale.
-->
<script lang="ts">
	import { assetFallback, assetSources, CITY, SCENE_HORIZON_PCT } from "../scene-config.js";

	const sources = assetSources(CITY.asset);
	const fallback = assetFallback(CITY.asset);

	/*
		The city is far smaller than the viewport, so the slot the browser should
		assume is the element's own width clamp, not ASSET_SIZES' 100vw.
	*/
	const sizes = CITY.widthCss;

	const style = [
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		`--city-x: ${CITY.centerXPct}%`,
		`--city-width: ${CITY.widthCss}`,
		`--city-aspect: ${CITY.aspect}`,
		`--reflection-scale-y: ${CITY.reflection.scaleY}`,
		`--reflection-opacity: ${CITY.reflection.opacity}`,
		`--reflection-blur: ${CITY.reflection.blurPx}px`,
		`--reflection-fade: ${CITY.reflection.fadeOutPct}%`,
		`--city-mask: url("${fallback}")`,
	].join("; ");
</script>

<div class="absolute inset-0" {style}>
	<picture class="city absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} {sizes} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
	<!-- Window lights: tiny neon dots clipped to the building silhouettes. -->
	<div class="city city-windows absolute"></div>
	<!-- Reflection: same plate, so the browser reuses the cached source. -->
	<picture class="city city-reflection absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} {sizes} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
</div>

<style>
	.city {
		display: block;
		left: var(--city-x);
		top: var(--horizon);
		width: var(--city-width);
		transform: translate(-50%, -100%);
		opacity: 0.85;
	}

	/*
		The raw plate is too pale against the bright horizon sky and read as a
		smudge: darken it into a proper silhouette and hug the building outline
		with a faint purple aura (static filter — never animated).
	*/
	.city img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--city-aspect);
		filter: brightness(0.5) saturate(1.35) drop-shadow(0 0 10px rgba(160, 80, 255, 0.5));
	}

	/*
		Lit windows: fixed 1-2px dots (they must NOT scale with the plate — real
		windows at this distance are pinpricks) painted as radial-gradients on a
		box that shares the city's geometry, then masked by the plate's own alpha
		so a dot can only ever land on a building. Static: nothing to gate for
		reduced motion.
	*/
	.city-windows {
		aspect-ratio: var(--city-aspect);
		opacity: 1;
		background-image:
			radial-gradient(circle 1px at 22% 66%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 27% 58%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 31% 72%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 38% 52%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 43% 64%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 49% 38%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 51% 55%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 57% 47%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 63% 68%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 69% 58%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 74% 74%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 0.6px at 81% 65%, rgba(140, 200, 255, 0.9) 99%, transparent),
			radial-gradient(circle 1px at 35% 78%, rgba(190, 120, 255, 0.85) 99%, transparent),
			radial-gradient(circle 0.6px at 47% 70%, rgba(190, 120, 255, 0.85) 99%, transparent),
			radial-gradient(circle 1px at 60% 80%, rgba(190, 120, 255, 0.85) 99%, transparent),
			radial-gradient(circle 0.6px at 78% 78%, rgba(190, 120, 255, 0.85) 99%, transparent);
		-webkit-mask-image: var(--city-mask);
		mask-image: var(--city-mask);
		-webkit-mask-size: 100% 100%;
		mask-size: 100% 100%;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}

	/*
		Mirror about the element's bottom edge: with `transform-origin: bottom`,
		the -100% translate and the negative squashed scale compose so the plate's
		bottom edge (the building bases) stays pinned on the horizon while the
		flipped content extends 55% of its height downward. The mask fades in
		LOCAL coordinates from the bottom edge up — the flip carries it along, so
		visually the reflection is brightest at the horizon and gone by 85% of its
		own height below it. Static: no animation, nothing to gate for reduced
		motion.
	*/
	.city-reflection {
		transform: translate(-50%, -100%) scaleY(var(--reflection-scale-y));
		transform-origin: bottom;
		opacity: var(--reflection-opacity);
		filter: blur(var(--reflection-blur));
		-webkit-mask-image: linear-gradient(to top, rgb(0 0 0), transparent var(--reflection-fade));
		mask-image: linear-gradient(to top, rgb(0 0 0), transparent var(--reflection-fade));
	}
</style>
