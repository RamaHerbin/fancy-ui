<!--
	City silhouette, in front of the far ridge (see SCENE_LAYERS order). The
	base was cropped and feathered to transparent where the floor grid used to
	be, so the building bases are effectively the image's own bottom edge;
	translateY(-100%) — relative to the element's own box — puts that edge on
	the scene horizon (48%) at any viewport width. The feathering forgives the
	approximation.
-->
<script lang="ts">
	import { assetFallback, assetSources, ASSET_SIZES } from "../scene-config.js";

	const sources = assetSources("skyline");
	const fallback = assetFallback("skyline");
</script>

<div class="absolute inset-0">
	<picture class="skyline absolute">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
		{/each}
		<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
	</picture>
</div>

<style>
	/*
		Widened into the scene's parallax bleed on both sides, same reasoning as
		MountainsFarLayer: the silhouette spans the full frame, and the horizon
		alignment is a percentage of the element's own height, so overscanning the
		width cannot shift the building bases off the horizon.
	*/
	.skyline {
		display: block;
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		top: 48%;
		width: calc(100% + 2 * var(--parallax-bleed-x, 0px));
		transform: translateY(-100%);
	}

	.skyline img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1280 / 853;
	}
</style>
