<!--
	Far mountain ridge: two copies of the crisp `mountains-sharp` strip at its
	natural aspect (never tiled, never stretched full-frame) — a large range
	anchored to the left edge and a smaller, dimmed one anchored to the right,
	overlapping mid-frame so the composite reads as a layered range. Both bases
	sit slightly below the horizon (`MOUNTAINS.basePct`) so the grid's bloom
	overlaps their feet; the sun layer stacks in front, so the ridge can never
	occlude the disc. A silhouette-masked magenta rim light tints each copy so
	the ridges read as sunset-lit rather than gray. The layer id stays
	`mountains-far` — only the asset drawn changed.
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
		/* Rim-light overlay is masked by the strip itself so the glow never
		   spills into the transparent sky between peaks. */
		`--ridge-mask: url("${fallback}")`,
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

	.ridge img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--ridge-aspect);
	}

	/*
		Magenta rim light: the raw strip renders gray-purple, but in the reference
		mock the ridges are lit pink from above. A vertical gradient — hot pink at
		the peaks fading out ~30% down, with a faint plum wash warming the body —
		is masked by the strip's own alpha (`--ridge-mask`) so it paints only the
		silhouette. Peaks reach highest into the box, so they catch the most
		light. Purely static paint: no motion, nothing for reduced-motion to gate.
	*/
	.ridge::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			rgba(224, 90, 168, 0.55) 0%,
			rgba(214, 75, 160, 0.45) 8%,
			rgba(214, 75, 160, 0) 30%,
			rgba(107, 42, 94, 0.28) 100%
		);
		-webkit-mask-image: var(--ridge-mask);
		mask-image: var(--ridge-mask);
		-webkit-mask-size: 100% 100%;
		mask-size: 100% 100%;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}

	.ridge-left {
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		width: var(--ridge-left-width);
	}

	.ridge-right {
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		width: var(--ridge-right-width);
		opacity: var(--ridge-right-opacity);
	}
</style>
