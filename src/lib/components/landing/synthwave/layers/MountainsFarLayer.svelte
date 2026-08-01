<!--
	Far mountain ridge: two copies of the crisp `mountains-sharp` strip at its
	natural aspect (never tiled, never stretched full-frame) — a large range
	anchored to the left edge and a smaller, dimmed one anchored to the right,
	overlapping mid-frame so the composite reads as a layered range. Both bases
	sit slightly below the horizon (`MOUNTAINS.basePct`) so the water band
	stacked in front covers their feet — the far-shore contact; the sun layer
	also stacks in front, so the ridge can never occlude the disc. v2 grade: the
	ranges are NEAR-BLACK SILHOUETTES — a static `MOUNTAINS.silhouette` filter
	on each img crushes the faces while a faint magenta rim from the source art
	survives. The layer id stays `mountains-far` — only the asset drawn changed.
	The strip's dark base band runs edge to edge, so each copy's inner cut end
	would render as a straight vertical wall on the horizon; a static clip-path
	slopes that end into an angular descending ridge instead.
-->
<script lang="ts">
	import { assetFallback, assetSources, MOUNTAINS, SCENE_HORIZON_PCT } from "../scene-config.js";

	const sources = assetSources(MOUNTAINS.asset);
	const fallback = assetFallback(MOUNTAINS.asset);

	/* Each range is narrower than the viewport, so `sizes` is its own width. */
	const leftSizes = `${MOUNTAINS.leftWidthVw}vw`;
	const rightSizes = `${MOUNTAINS.rightWidthVw}vw`;

	const layerStyle = [
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		`--ridge-base: ${MOUNTAINS.basePct}%`,
		`--ridge-left-width: ${MOUNTAINS.leftWidthVw}vw`,
		`--ridge-right-width: ${MOUNTAINS.rightWidthVw}vw`,
		`--ridge-right-opacity: ${MOUNTAINS.rightOpacity}`,
		`--ridge-aspect: ${MOUNTAINS.aspect}`,
		/* Static silhouette grade (allowed — never animated): crushes each range
		   to near-black while the source art's magenta rim survives. */
		`--ridge-silhouette: brightness(${MOUNTAINS.silhouette.brightness}) saturate(${MOUNTAINS.silhouette.saturate})`,
	].join("; ");
</script>

<div class="absolute inset-0" style={layerStyle}>
	<picture class="ridge ridge-left absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={leftSizes} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
	<picture class="ridge ridge-right absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={rightSizes} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
</div>

<style>
	/*
		`--ridge-base` sits 1.6% of frame height below the horizon; translateY is
		relative to the element's own box, so -100% lands each strip's bottom edge
		exactly on that line at any viewport width. Both ranges spread into the
		parallax bleed on their anchored side so pointer parallax never opens a
		notch of bare sky at the frame edge.
	*/
	.ridge {
		display: block;
		top: var(--ridge-base);
		transform: translateY(-100%);
	}

	/*
		The v1 layer painted a masked hot-pink rim-light overlay here — the exact
		"lit pink" read v2 retires. The silhouette grade replaces it: a static
		filter darkens the strip itself, and whatever rim the source art carries
		is all the rim light the ridge gets. Purely static paint: no motion,
		nothing for reduced-motion to gate.
	*/
	.ridge img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--ridge-aspect);
		filter: var(--ridge-silhouette);
	}

	/*
		Sloped inner ends. The source strip's bottom third is a solid band that
		reaches both edges of the image, so an unclipped copy ends in a straight
		vertical cut — on the horizon that cut reads as a stretched rectangle
		standing in the water. A static two-segment clip-path (steeper up top,
		shallower at the base, like a real talus line) turns each inner end into
		an angular descending slope; the outer ends stay square because they are
		anchored off-frame in the parallax bleed. Purely static geometry.
	*/
	.ridge-left {
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		width: var(--ridge-left-width);
		clip-path: polygon(0 0, 76% 0, 88% 58%, 100% 100%, 0 100%);
	}

	.ridge-right {
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		width: var(--ridge-right-width);
		opacity: var(--ridge-right-opacity);
		clip-path: polygon(24% 0, 100% 0, 100% 100%, 0 100%, 12% 58%);
	}
</style>
