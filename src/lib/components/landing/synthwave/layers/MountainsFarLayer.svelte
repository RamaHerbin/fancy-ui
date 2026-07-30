<!--
	Far mountain ridge: full-width and edge-to-edge (the source touches both
	side edges, so it must never tile). Its content band sits at ~41-64% of
	the image's own height; a `translateY` percentage is relative to the
	element's own box, so translateY(-64%) lands the ridge's base exactly on
	the scene horizon (48%) at any viewport width, without knowing the image's
	pixel height.
-->
<script lang="ts">
	import { assetFallback, assetSources, ASSET_SIZES } from "../scene-config.js";

	const sources = assetSources("mountains-far");
	const fallback = assetFallback("mountains-far");
</script>

<div class="absolute inset-0">
	<picture class="ridge absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
</div>

<style>
	/*
		Widened into the scene's parallax bleed on both sides: the ridge touches the
		frame edges, so without the overscan pointer parallax opens a notch of bare
		sky at whichever edge it slides away from. Widening is safe because the
		horizon alignment below is a percentage of the element's own height, which
		tracks the width — the ridge grows a few percent and its base stays put.
	*/
	.ridge {
		display: block;
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		top: 48%;
		width: calc(100% + 2 * var(--parallax-bleed-x, 0px));
		transform: translateY(-64%);
	}

	.ridge img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1280 / 853;
	}
</style>
