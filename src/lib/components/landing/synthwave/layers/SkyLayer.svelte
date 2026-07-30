<!--
	Static gradient sky, the backdrop every other layer sits in front of. The
	palette's three stops (navy / violet / magenta) are compressed into the top
	48% of the layer — the horizon line — then held flat down to the bottom so
	the ground layers always have a solid magenta haze to sit on. Nothing here
	animates; `SCENE_LAYERS` gives it depth 0 for a reason.
-->
<div class="sky absolute inset-0">
	<div class="horizon-glow absolute inset-x-0"></div>
</div>

<style>
	.sky {
		/* Stops 0 / 0.55 / 1 squeezed into 0%-48% (the horizon), then flat. */
		background: linear-gradient(to bottom, #07001a 0%, #22073f 26.4%, #7a1e52 48%, #7a1e52 100%);
	}

	.horizon-glow {
		top: 38%;
		height: 20%;
		background: radial-gradient(
			ellipse 60% 100% at 50% 50%,
			rgba(255, 45, 120, 0.5),
			rgba(255, 45, 120, 0) 72%
		);
		filter: blur(28px);
	}
</style>
