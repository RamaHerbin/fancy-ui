<!--
	Static sky backdrop, three stacked children (DOM order is the stacking):

	1. Gradient base — near-black falling through deep violet into a restrained
	   plum band exactly at the horizon, then DARK fast below it. v2: every stop
	   is pulled toward black (the config carries them) — the sky away from the
	   sun must read near-black, not pink haze.
	2. Cloud plate — the `sky-clouds` raster (thin horizontal striated clouds
	   lit magenta/orange, re-cropped in v2 to keep the bright streak band with
	   its hottest streaks at the bottom edge), bottom edge anchored on the
	   horizon, top-faded into the gradient so it never seams.
	3. Edge vignette — a sky-local radial darkening centred on the sun's spot:
	   transparent pocket around the sunset (~500px on a desktop footer), then a
	   ramp to near-black (#0c0212) at the left/right extremes and top corners.
	   It sits UNDER the sun bloom so the pocket keeps its full brightness, and
	   it only grades the sky — mountains/water/grid stack in front untouched.
	4. Sun bloom — one warm radial ellipse straddling the horizon where the sun
	   disc will sit. v2: tighter + dimmer (SKY.sunBloom), so the light
	   CONCENTRATES around the disc instead of washing the whole sky.

	Nothing here animates; `SCENE_LAYERS` gives the sky depth 0 for a reason, so
	there is no motion to gate under reduced motion either.
-->
<script lang="ts">
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		SCENE_COLORS,
		SCENE_HORIZON_PCT,
		SKY,
	} from "../scene-config.js";

	const sources = assetSources("sky-clouds");
	const fallback = assetFallback("sky-clouds");

	/** Gradient base assembled from the config's [color, pct] stop pairs. */
	const skyGradient = `linear-gradient(to bottom, ${SKY.gradientStops
		.map(([color, pct]) => `${color} ${pct}%`)
		.join(", ")})`;

	/** Warm-to-magenta bloom, composed from the palette's bare RGB triplets. */
	const bloomGradient = `radial-gradient(ellipse at center, rgba(${SCENE_COLORS.sunsetOrangeRGB}, ${SKY.sunBloom.orangeAlpha}), rgba(${SCENE_COLORS.magentaBrightRGB}, ${SKY.sunBloom.magentaAlpha}) 45%, transparent 72%)`;

	/**
	 * Edge vignette — sky-local calibration (the config carries no sky-vignette
	 * numbers; the atmosphere's `SCENE_GRADE.vignette` is a different, global
	 * pass). `12, 2, 18` is #0c0212, the near-black target at the extremes.
	 *
	 * Geometry: an ellipse centred on the sun's spot (50%, horizon), rx 53% of
	 * the frame width so the side edges land near the end of the ramp, ry 130%
	 * of the height so the top-centre sky (already near-black) stays inside the
	 * transparent pocket while the top corners reach the ramp's end. The inner
	 * 48% stop keeps ≈500px around the sun at full brightness on a desktop
	 * footer; the outer thirds pick up a ~0.2 wash and the extremes crush to
	 * ~0.9 so the horizon's plum band no longer reads as a full-width wash.
	 */
	const edgeVignetteGradient = `radial-gradient(ellipse 53% 130% at 50% ${SCENE_HORIZON_PCT}%, transparent 48%, rgba(12, 2, 18, 0.22) 66%, rgba(12, 2, 18, 0.6) 82%, rgba(12, 2, 18, 0.92) 98%)`;
</script>

<div
	class="absolute inset-0"
	style={`--horizon: ${SCENE_HORIZON_PCT}%; --sky-gradient: ${skyGradient}; --bloom-gradient: ${bloomGradient}; --edge-vignette: ${edgeVignetteGradient}; --cloud-min-width: ${SKY.cloudPlateMinWidthPx}px; --cloud-top-fade: ${SKY.cloudPlateTopFadePct}%; --cloud-opacity: ${SKY.cloudPlateOpacity}; --bloom-width: ${SKY.sunBloom.widthVw}vw; --bloom-aspect: ${SKY.sunBloom.aspect}; --bloom-offset-y: ${SKY.sunBloom.offsetYPct}%; --bloom-blur: ${SKY.sunBloom.blurPx}px;`}
>
	<div class="sky-gradient absolute"></div>
	<picture class="sky-clouds absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
	<div class="edge-vignette absolute"></div>
	<div class="sun-bloom absolute"></div>
</div>

<style>
	/* Hard-edged full-bleed box: spread into the parallax bleed so a pointer
	   drift can never expose bare frame behind the scene. */
	.sky-gradient {
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		top: calc(-1 * var(--parallax-bleed-y, 0px));
		bottom: calc(-1 * var(--parallax-bleed-y, 0px));
		background: var(--sky-gradient);
	}

	/*
		Bottom edge ON the horizon, excess height cropping out of the frame top.
		The min-width floor keeps tall/narrow viewports covered; the top mask
		dissolves the plate's upper edge into the gradient base above it.
	*/
	.sky-clouds {
		display: block;
		left: 50%;
		top: var(--horizon);
		width: max(calc(100% + 2 * var(--parallax-bleed-x, 0px)), var(--cloud-min-width));
		transform: translate(-50%, -100%);
		opacity: var(--cloud-opacity);
		-webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--cloud-top-fade));
		mask-image: linear-gradient(to bottom, transparent, #000 var(--cloud-top-fade));
	}

	/* Native aspect of the v2 crop (1536x650 source -> 1280x542 rendition). */
	.sky-clouds img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1536 / 650;
	}

	/* Full-bleed like the gradient base: the darkening must reach the true frame
	   edges even at maximum parallax drift. DOM order puts it over the gradient
	   and cloud plate but UNDER the sun bloom, so the sunset pocket keeps its
	   current brightness while the outer thirds and top corners sink. */
	.edge-vignette {
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		top: calc(-1 * var(--parallax-bleed-y, 0px));
		bottom: calc(-1 * var(--parallax-bleed-y, 0px));
		background: var(--edge-vignette);
	}

	/* Static warm glow centred on the sun's spot, straddling the horizon.
	   Sized/dimmed from SKY.sunBloom via the inline custom properties above.
	   Static blur is fine (never animated), so no will-change. */
	.sun-bloom {
		left: 50%;
		top: var(--horizon);
		width: var(--bloom-width);
		aspect-ratio: var(--bloom-aspect);
		transform: translate(-50%, var(--bloom-offset-y));
		background: var(--bloom-gradient);
		filter: blur(var(--bloom-blur));
	}
</style>
