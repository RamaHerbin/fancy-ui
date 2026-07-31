<!--
	Static sky backdrop, three stacked children (DOM order is the stacking):

	1. Gradient base — deep indigo falling through violet into a bright magenta
	   band exactly at the horizon, then DARK fast below it (the old flat magenta
	   band below the horizon was the "opaque pink bar" bug).
	2. Cloud plate — the `sky-clouds` raster (streaky sunset haze), bottom edge
	   anchored on the horizon, top-faded into the gradient so it never seams.
	3. Sun bloom — one broad warm radial ellipse straddling the horizon where
	   the sun disc will sit, so the sky already glows before the sun layer draws.

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
	const bloomGradient = `radial-gradient(ellipse at center, rgba(${SCENE_COLORS.sunsetOrangeRGB}, 0.32), rgba(${SCENE_COLORS.magentaBrightRGB}, 0.22) 45%, transparent 72%)`;
</script>

<div
	class="absolute inset-0"
	style={`--horizon: ${SCENE_HORIZON_PCT}%; --sky-gradient: ${skyGradient}; --bloom-gradient: ${bloomGradient}; --cloud-min-width: ${SKY.cloudPlateMinWidthPx}px; --cloud-top-fade: ${SKY.cloudPlateTopFadePct}%; --cloud-opacity: ${SKY.cloudPlateOpacity};`}
>
	<div class="sky-gradient absolute"></div>
	<picture class="sky-clouds absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
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

	.sky-clouds img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1280 / 569;
	}

	/* Static warm glow centred on the sun's spot, straddling the horizon.
	   Static blur is fine (never animated), so no will-change. */
	.sun-bloom {
		left: 50%;
		top: var(--horizon);
		width: 70vw;
		aspect-ratio: 7 / 3;
		transform: translate(-50%, -55%);
		background: var(--bloom-gradient);
		filter: blur(36px);
	}
</style>
