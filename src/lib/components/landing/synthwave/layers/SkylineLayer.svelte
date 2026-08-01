<!--
	Neon city at the water's edge, right of frame — v2: PROMOTED from a faint
	silhouette to a clearly visible blue-cyan cluster. The plate's base is flush
	with the image's own bottom edge (zero bottom padding), so `top:
	var(--horizon)` + `translate(-50%, -100%)` — percentages of the element's
	own box — puts the building bases exactly on the waterline at any viewport.
	The source art is magenta/violet; the static CITY.tint filter re-grades it
	into the reference's cyan neon.

	This layer draws the city ABOVE the horizon only: the water band owns every
	below-horizon pixel and renders the mirrored reflection itself (from
	`WATER.cityReflection`). All geometry and the tint come from CITY in
	scene-config; the local details are the window-light dots (fixed-pixel neon
	dots masked by the plate's own alpha, so every dot lands on a building at
	any viewport scale) and the faint cyan aura hugging the building outline.
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
		`--city-tint: hue-rotate(${CITY.tint.hueRotateDeg}deg) saturate(${CITY.tint.saturate}) brightness(${CITY.tint.brightness})`,
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
</div>

<style>
	.city {
		display: block;
		left: var(--city-x);
		top: var(--horizon);
		width: var(--city-width);
		transform: translate(-50%, -100%);
	}

	/*
		The blue-cyan neon grade (CITY.tint, static filter — never animated):
		hue-rotate turns the magenta source art cyan, then saturate/brightness
		push it to "lit city", not "smudge". The trailing drop-shadow is the one
		local flourish: a faint cyan aura hugging the building outline so the
		cluster blooms against the dark shore like the reference.
	*/
	.city img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--city-aspect);
		filter: var(--city-tint) drop-shadow(0 0 10px rgba(80, 200, 255, 0.45));
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
			radial-gradient(circle 1px at 35% 78%, rgba(150, 230, 255, 0.85) 99%, transparent),
			radial-gradient(circle 0.6px at 47% 70%, rgba(150, 230, 255, 0.85) 99%, transparent),
			radial-gradient(circle 1px at 60% 80%, rgba(150, 230, 255, 0.85) 99%, transparent),
			radial-gradient(circle 0.6px at 78% 78%, rgba(150, 230, 255, 0.85) 99%, transparent);
		-webkit-mask-image: var(--city-mask);
		mask-image: var(--city-mask);
		-webkit-mask-size: 100% 100%;
		mask-size: 100% 100%;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}
</style>
