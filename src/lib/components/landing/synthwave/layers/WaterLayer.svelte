<!--
	The dark reflective water band between the far shore and the grid floor.
	It stacks behind the grid and in front of sun/skyline/mountains, so it
	covers their feet and owns every below-horizon pixel down to the grid's
	shore edge. The surface is FULLY OPAQUE from the waterline through the
	shore blend — solid color stops, never alpha over the layers behind — so
	the submerged slice of the sun plate (disc bottom plus the glow baked
	below it) is occluded outright. Back to front: near-black surface, faint
	sheen streaks, the sun's blurred glow column, the shimmer dashes riding
	on it, the mirrored city, and the horizon rim straddling the waterline
	(which replaces the grid's v1 horizon line).

	All geometry and color comes from WATER / CITY / SUN / SCENE_COLORS in
	scene-config; the only local numbers are the sheen streak placement, the
	glow column's bloom radius and its top overdraw, the shimmer dash rhythm
	(dash heights, widths, spacing and the per-dash alpha taper are texture
	details; the top alpha is the config's), the rim's intensity
	profile (peak/shoulder alphas and stop offsets around the config-owned
	sun and city anchors — texture detail again), the surface exposure grade
	(both config stops pulled ~35% toward black), and the 28px shore blend
	that grades the band's bottom edge into the grid floor's own color. The
	band's percentage anchors are frame percentages, so only the full-bleed
	base spreads into the parallax bleed — the reflections stay in frame
	coordinates to line up with the sun and skyline layers.

	Entirely static: no tweens, no will-change, nothing to gate under reduced
	motion.
-->
<script lang="ts">
	import {
		assetFallback,
		assetSources,
		CITY,
		SCENE_COLORS,
		SCENE_HORIZON_PCT,
		SUN,
		WATER,
	} from "../scene-config.js";

	const sources = assetSources(CITY.asset);
	const fallback = assetFallback(CITY.asset);

	/*
		The mirrored city is far smaller than the viewport, so the slot the
		browser should assume is the element's own width clamp, not 100vw.
	*/
	const sizes = CITY.widthCss;

	const style = [
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		`--water-top: ${WATER.topPct}%`,
		`--water-height: ${WATER.bottomPct - WATER.topPct}%`,
		/*
			Round-2 exposure grade: at the config stops the band read as a lit
			purple strip, where the reference water is near-black with only
			sparkle highlights. Both stops are multiplied 35% toward black before
			any rule sees them (waterTop #1c0733 lands at ≈#120421, the ref's
			#16041f family). The mix lives here, not in config: the art director
			owns the hue, this layer owns the exposure.
		*/
		`--water-base-top: color-mix(in srgb, ${WATER.baseTop} 65%, black)`,
		`--water-base-bottom: color-mix(in srgb, ${WATER.baseBottom} 65%, black)`,
		/*
			The shore blend's landing color: the grid floor's own near-black, so
			the opaque band grades into the floor with no visible hand-off.
		*/
		`--shore-floor: ${SCENE_COLORS.nightFloor}`,
		`--sheen-color: rgba(${WATER.sheenRGB}, ${WATER.sheenAlpha})`,
		`--sun-col-x: ${WATER.sunReflection.centerXPct}%`,
		`--sun-col-width: ${SUN.discWidthCss}`,
		/*
			The shimmer's orange (#ff7a2f) is the disc's own mid-ramp hue (the
			sun layer's regrade runs #ffd34f → #ff7a2e → #d93a2b), NOT config's
			pinker sunsetOrange: rounds 1-2 ran the sunsetOrange ramp at disc
			width and the column read as the submerged disc ghosting through the
			band instead of as light on the water.
		*/
		`--shimmer-rgb: 255, 122, 47`,
		`--shimmer-top-alpha: ${WATER.sunReflection.topAlpha}`,
		/*
			The glow column follows config's own documented recipe for the sun
			reflection — sunsetOrange at `topAlpha`, crimson at `midAlpha` past the
			midpoint, transparent by the bottom. It can afford config's pinker
			orange where the shimmer dashes cannot: it is bloom, not a hard edge,
			so the hue never resolves into a silhouette.
		*/
		`--glow-top: rgba(${SCENE_COLORS.sunsetOrangeRGB}, ${WATER.sunReflection.topAlpha})`,
		`--glow-mid: rgba(${SCENE_COLORS.crimsonRGB}, ${WATER.sunReflection.midAlpha})`,
		`--city-x: ${CITY.centerXPct}%`,
		`--city-width: ${CITY.widthCss}`,
		`--city-aspect: ${CITY.aspect}`,
		`--city-tint: hue-rotate(${CITY.tint.hueRotateDeg}deg) saturate(${CITY.tint.saturate}) brightness(${CITY.tint.brightness})`,
		`--city-reflection-scale-y: ${WATER.cityReflection.scaleY}`,
		`--city-reflection-opacity: ${WATER.cityReflection.opacity}`,
		`--city-reflection-blur: ${WATER.cityReflection.blurPx}px`,
		`--city-reflection-fade: ${WATER.cityReflection.fadeOutPct}%`,
		`--rim-hot: rgba(${SCENE_COLORS.sunsetOrangeRGB}, 0.9)`,
		`--rim-warm: rgba(${SCENE_COLORS.magentaBrightRGB}, ${WATER.shoreline.alpha})`,
		`--rim-warm-faint: rgba(${SCENE_COLORS.magentaBrightRGB}, 0.12)`,
		/*
			Faint cyan for the rim segment directly under the city. Config has no
			cyan token — the city's cyan is produced by its hue-rotate tint — so
			this literal matches the hue that tint yields on the plate's highlights.
		*/
		`--rim-cyan: rgba(120, 224, 255, 0.3)`,
		`--shore-fade: ${WATER.shoreline.fadeInPct}%`,
	].join("; ");
</script>

<div class="absolute inset-0" {style}>
	<!-- 1. Surface: near-black vertical gradient, hard-edged so it spreads into the bleed. -->
	<div class="band water-base absolute"></div>
	<!-- 2. Sheen: three 1px streaks with transparent ends (no hard edge, no bleed needed). -->
	<div class="water-sheen absolute"></div>
	<!-- 3. Sun glow: a blurred warm column under the disc, clipped to the band. -->
	<div class="sun-glow absolute"><div class="sun-glow-core"></div></div>
	<!-- 4. Sun shimmer: broken dashes riding on the glow, tapering toward the viewer. -->
	<div class="sun-reflection absolute"></div>
	<!-- 5. City reflection: the skyline plate mirrored — the browser reuses the cached source. -->
	<picture class="city-reflection absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} {sizes} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
	<!-- 6. Shoreline: one consistent 2px rim straddling the waterline. -->
	<div class="shoreline absolute"></div>
</div>

<style>
	.band {
		top: var(--water-top);
		height: var(--water-height);
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		right: calc(-1 * var(--parallax-bleed-x, 0px));
	}

	/*
		Round-2 seam fix, round-3 opacity fix: the band used to stop dead on
		its config bottom edge, where the grid floor's fade-in is still ~10%
		opaque — the cut read as a pasted rectangle. The surface now runs 28px
		past that edge, grading over the extension into the grid floor's own
		near-black. The grade is a COLOR ramp, never an alpha ramp: round 2
		faded the extension to transparent, and the sun plate's below-disc glow
		(which sits behind the water there) ghosted through the see-through
		strip as the submerged disc. Every stop is opaque, so the band occludes
		the sun outright and still dissolves into the floor's matching color.
		The config band span itself is untouched: `calc(100% -
		var(--shore-blend))` of the stretched box IS the config bottom edge.
	*/
	.water-base {
		--shore-blend: 28px;
		height: calc(var(--water-height) + var(--shore-blend));
		background: linear-gradient(
			to bottom,
			var(--water-base-top),
			var(--water-base-bottom) calc(100% - var(--shore-blend)),
			var(--shore-floor)
		);
	}

	/*
		Three thin surface streaks at varying widths and offsets, each a 1px-tall
		horizontal gradient fading out at its own ends. Painted as background
		layers on one frame-width box so the streak count costs one element.
	*/
	.water-sheen {
		top: var(--water-top);
		height: var(--water-height);
		left: 0;
		right: 0;
		background-image:
			linear-gradient(
				to right,
				transparent,
				var(--sheen-color) 25%,
				var(--sheen-color) 75%,
				transparent
			),
			linear-gradient(
				to right,
				transparent,
				var(--sheen-color) 30%,
				var(--sheen-color) 70%,
				transparent
			),
			linear-gradient(
				to right,
				transparent,
				var(--sheen-color) 20%,
				var(--sheen-color) 80%,
				transparent
			);
		background-size:
			46% 1px,
			32% 1px,
			58% 1px;
		background-position:
			14% 26%,
			72% 52%,
			35% 76%;
		background-repeat: no-repeat;
	}

	/*
		The sun's reflection is TWO elements: this blurred glow column, and the
		shimmer dashes below that ride on top of it.

		Round 3 shipped the dashes alone and the water read as unlit — the
		reference pools a soft warm column of light under the disc, all the way
		down the band, and only breaks it up with shimmer. The column is back,
		but built so it cannot repeat the rounds 1-2 failure (a disc-wide,
		hard-edged column whose bright top corner traced the disc's lower arc,
		so the sun read as ghosting through the band):

		- the core is 55% of the DISC's width, far too narrow to restate the
		  disc's silhouette, and a 32px bloom dissolves what edges it has;
		- the core overdraws 1.5 bloom radii ABOVE the waterline, and holds its
		  flat top color across all of that overdraw plus the first few px of
		  water, so the blur is still near full strength where the column meets
		  the shoreline instead of having already fallen off into it. The
		  wrapper's mask (`no-repeat`, so the tiled default cannot let the
		  overdraw reappear above the band) clips the overdraw at the waterline
		  and fades the column's foot into the shore, which keeps every lit
		  pixel inside the water.

		Only the bloom radius, the overdraw and the taper stops are local; the
		gradient's colors are config's documented recipe, via `--glow-top` /
		`--glow-mid`.
	*/
	.sun-glow {
		--glow-bloom: 32px;
		--glow-overdraw: calc(1.5 * var(--glow-bloom));
		left: 0;
		right: 0;
		top: var(--water-top);
		height: var(--water-height);
		-webkit-mask-image: linear-gradient(to bottom, rgb(0 0 0) 76%, transparent);
		mask-image: linear-gradient(to bottom, rgb(0 0 0) 76%, transparent);
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}

	.sun-glow-core {
		position: absolute;
		left: var(--sun-col-x);
		top: calc(-1 * var(--glow-overdraw));
		width: calc(0.55 * var(--sun-col-width));
		height: calc(100% + var(--glow-overdraw));
		transform: translateX(-50%);
		background: linear-gradient(
			to bottom,
			var(--glow-top) 0 calc(var(--glow-overdraw) + 6px),
			var(--glow-mid) 74%,
			transparent
		);
		filter: blur(var(--glow-bloom));
	}

	/*
		The shimmer: five horizontal dashes on top of the glow, each narrower
		and fainter than the one above, so the light breaks up the way water
		carries it away from the source. Every dash fades out at its own ends.

		The brightest dash takes the config `topAlpha`; the taper alphas, the
		dash heights and the spacing are local texture. Positions are
		PERCENTAGES of the band, not px: round 3 placed them at fixed offsets
		(2..52px) and the last two fell outside a band that is only ~40px tall
		at 1440x900, so two of the seven never painted. The vertical mask still
		guarantees the shimmer is fully transparent before the band's bottom
		edge at any viewport height.
	*/
	.sun-reflection {
		left: var(--sun-col-x);
		top: var(--water-top);
		width: calc(0.6 * var(--sun-col-width));
		height: var(--water-height);
		transform: translateX(-50%);
		background-image:
			linear-gradient(
				to right,
				transparent,
				rgba(var(--shimmer-rgb), var(--shimmer-top-alpha)) 25% 75%,
				transparent
			),
			linear-gradient(to right, transparent, rgba(var(--shimmer-rgb), 0.32) 25% 75%, transparent),
			linear-gradient(to right, transparent, rgba(var(--shimmer-rgb), 0.22) 25% 75%, transparent),
			linear-gradient(to right, transparent, rgba(var(--shimmer-rgb), 0.14) 25% 75%, transparent),
			linear-gradient(to right, transparent, rgba(var(--shimmer-rgb), 0.07) 25% 75%, transparent);
		background-size:
			100% 4px,
			84% 3px,
			68% 3px,
			52% 3px,
			38% 2px;
		background-position:
			50% 8%,
			50% 26%,
			50% 44%,
			50% 62%,
			50% 76%;
		background-repeat: no-repeat;
		-webkit-mask-image: linear-gradient(to bottom, rgb(0 0 0) 78%, transparent 94%);
		mask-image: linear-gradient(to bottom, rgb(0 0 0) 78%, transparent 94%);
	}

	/*
		Mirror about the element's bottom edge (same proven technique as the v1
		skyline reflection): with `transform-origin: bottom`, the -100% translate
		and the negative squashed scale compose so the plate's bottom edge (the
		building bases) stays pinned on the waterline while the flipped content
		extends half its height downward. The fade mask lives in LOCAL
		coordinates and the flip carries it along — visually the reflection is
		brightest at the waterline and gone by `fadeOutPct` of its own height.
	*/
	.city-reflection {
		display: block;
		left: var(--city-x);
		top: var(--horizon);
		width: var(--city-width);
		transform: translate(-50%, -100%) scaleY(var(--city-reflection-scale-y));
		transform-origin: bottom;
		opacity: var(--city-reflection-opacity);
		-webkit-mask-image: linear-gradient(
			to top,
			rgb(0 0 0),
			transparent var(--city-reflection-fade)
		);
		mask-image: linear-gradient(to top, rgb(0 0 0), transparent var(--city-reflection-fade));
	}

	/* Skyline tint + reflection blur, so both halves of the city match. Static filter. */
	.city-reflection img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--city-aspect);
		filter: var(--city-tint) blur(var(--city-reflection-blur));
	}

	/*
		The horizon rim: ONE consistent edge for the whole waterline. The
		backdrop plates leave slightly uneven light in the last pixel or two
		above the horizon (brighter left of the sun than right), so the rim is
		built from two background layers on a 3px box straddling the waterline:

		- underlay: an opaque run of the water's own top color spanning the full
		  box, fading only at the frame's outer edges — it swallows the stray
		  plate light so both sides of the sun read identical;
		- rim color: a 2px strip pinned to the box's bottom — warm
		  magenta-orange peaking AT the sun's reflection axis, dimming with
		  distance, and rising to a faint cyan only directly under the city
		  before fading out. Anchors are the config-owned sun/city x positions.

		Both gradients end transparent inside the frame, so no bleed spread.
	*/
	.shoreline {
		left: 0;
		right: 0;
		top: calc(var(--horizon) - 2px);
		height: 3px;
		background-image:
			linear-gradient(
				to right,
				transparent var(--shore-fade),
				var(--rim-warm) calc(var(--sun-col-x) - 12%),
				var(--rim-hot) var(--sun-col-x),
				var(--rim-warm) calc(var(--sun-col-x) + 12%),
				var(--rim-warm-faint) calc(var(--city-x) - 8%),
				var(--rim-cyan) var(--city-x),
				transparent calc(var(--city-x) + 6%)
			),
			linear-gradient(to right, transparent, var(--water-base-top) 5% 95%, transparent);
		background-size:
			100% 2px,
			100% 100%;
		background-position:
			left bottom,
			left top;
		background-repeat: no-repeat;
	}
</style>
