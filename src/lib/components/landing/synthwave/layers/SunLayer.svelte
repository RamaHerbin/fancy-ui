<!--
	The striped sun disc — the scene's focal point. The raster plate carries
	generous transparent margin around the disc, so every anchor here derives
	from the measured disc bounding box (`SUN.disc*Frac`): the translate
	percentages pin the DISC bottom edge on the waterline anchor
	(`SUN.discBottomPct`, a hair below the horizon) and centre the DISC (not the
	plate) on mid-frame. The water band stacked in front clips that 0.4% sliver,
	so the disc reads as SITTING ON the water — this layer paints nothing below
	the horizon; the reflection column is the water layer's job. Three static
	repaints stack over the plate in DOM order, and the ORDER is the whole
	trick: `.sun-restripe` resurfaces the disc with a clean vertical ramp that
	buries every scanline the raster baked in, `.sun-regrade` swaps
	hue/saturation for the v2 yellow → orange → crimson ramp via
	`mix-blend-mode: color`, and only THEN does `.restripe-lines` draw the new
	bands. Lines drawn before the regrade came back re-hued: `color` takes hue
	from the gradient and luminance from below, so a dark line under an orange
	stop rendered as muddy brown. Painting them last keeps them crimson. The
	halo is a blurred radial div, not part of the raster asset, so it can pulse
	on its own without a second image.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		getSceneContext,
		SCENE_COLORS,
		SUN,
		SUN_HALO_PULSE_SECONDS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources(SUN.asset);
	const fallback = assetFallback(SUN.asset);

	/*
		The plate is far narrower than the viewport, so the slot the browser
		should assume is the plate's own width clamp, not ASSET_SIZES' 100vw.
	*/
	const sizes = SUN.plateWidthCss;

	/*
		Geometry and palette flow in from scene-config as custom properties on the
		layer wrapper (never on `.sun-halo` itself — a reduced-motion test asserts
		the halo carries no inline style).
	*/
	const layerStyle = [
		`--disc-bottom: ${SUN.discBottomPct}%`,
		`--plate-width: ${SUN.plateWidthCss}`,
		`--plate-aspect: ${SUN.plateAspect}`,
		`--disc-center-x-frac: ${SUN.discCenterXFrac}`,
		`--disc-bottom-frac: ${SUN.discBottomFrac}`,
		`--disc-width-frac: ${SUN.discWidthFrac}`,
		`--halo-size: ${SUN.haloWidthCss}`,
		`--disc-width: ${SUN.discWidthCss}`,
		`--halo-orange-alpha: ${SUN.halo.orangeAlpha}`,
		`--halo-magenta-alpha: ${SUN.halo.magentaAlpha}`,
		`--halo-blur: ${SUN.halo.blurPx}px`,
		`--sunset-orange-rgb: ${SCENE_COLORS.sunsetOrangeRGB}`,
		`--magenta-bright-rgb: ${SCENE_COLORS.magentaBrightRGB}`,
	].join("; ");

	let haloEl: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: halo holds its static pose

		// `gsap.to` rather than `tl.to`, because a timeline's `.to()` returns the
		// timeline itself — killing that on cleanup would take the whole scene down.
		const tween = gsap.to(haloEl, {
			scale: SUN.haloPulseScale,
			yoyo: true,
			repeat: -1,
			duration: SUN_HALO_PULSE_SECONDS,
			ease: "sine.inOut",
		});
		tl.add(tween, 0);

		return () => {
			tween.kill();
			gsap.set(haloEl, { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0" style={layerStyle}>
	<!-- Behind the disc in DOM order: glow around the disc, never over its bands. -->
	<div bind:this={haloEl} class="sun-halo absolute"></div>
	<picture>
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} {sizes} />
		{/each}
		<img
			src={fallback}
			alt=""
			loading="lazy"
			decoding="async"
			draggable="false"
			class="sun-image absolute"
		/>
	</picture>
	<!-- Resurfacing wash: buries the raster's baked scanlines under a clean ramp. -->
	<div class="sun-restripe absolute"></div>
	<!-- After the img in DOM order: the color-blend regrade sits ON the disc. -->
	<div class="sun-regrade absolute"></div>
	<!-- Last, so the crimson survives the regrade: the new band rhythm. -->
	<div class="restripe-lines absolute"></div>
</div>

<style>
	.sun-image {
		left: 50%;
		top: var(--disc-bottom);
		width: var(--plate-width);
		height: auto;
		aspect-ratio: var(--plate-aspect);
		/*
			Translate percentages are of the element's own box: the y fraction puts
			the measured disc BOTTOM exactly on the waterline anchor, the x fraction
			centres the measured disc on mid-frame.
		*/
		transform: translate(
			calc(-100% * var(--disc-center-x-frac)),
			calc(-100% * var(--disc-bottom-frac))
		);
		/*
			Trim the plate to the very circle every overlay above it is drawn on,
			expressed in the plate's own box from the same config fractions. The
			raster's painted disc runs a little wider than the measured bounding box
			and sits a few px right of it, so its bare rim used to survive as a
			magenta crescent down the right side — the one part of the disc no
			repaint reached. Deriving the trim from `--disc-*` rather than from a
			fudge constant means it keeps matching the overlays if those measured
			fractions are ever re-measured.
		*/
		--plate-height: calc(var(--plate-width) / var(--plate-aspect));
		--disc-radius: calc(0.5 * var(--disc-width));
		-webkit-mask-image: radial-gradient(
			circle var(--disc-radius) at calc(var(--disc-center-x-frac) * var(--plate-width))
				calc(var(--disc-bottom-frac) * var(--plate-height) - var(--disc-radius)),
			#000 calc(100% - 1.5px),
			transparent 100%
		);
		mask-image: radial-gradient(
			circle var(--disc-radius) at calc(var(--disc-center-x-frac) * var(--plate-width))
				calc(var(--disc-bottom-frac) * var(--plate-height) - var(--disc-radius)),
			#000 calc(100% - 1.5px),
			transparent 100%
		);
	}

	.sun-restripe {
		left: 50%;
		top: var(--disc-bottom);
		width: var(--disc-width);
		aspect-ratio: 1 / 1;
		/* Static node — GSAP never touches it, so translate centring is safe. */
		transform: translate(-50%, -100%);
		border-radius: 50%;
		/*
			The plate's own vertical ramp, sampled row by row off the raster and
			smoothed until only the ramp survives — so this paints exactly what the
			disc would look like if nobody had baked scanlines into it. Doing the
			erasure as a gradient rather than as a blurred second copy of the plate
			matters at the TOP of the dome: the raster's two widest bands sit at ~6%
			and ~21% of disc height, close enough to the rim that any blur strong
			enough to flatten them also eats the edge. A repaint has no such limit.
			It also drops an image decode and a full-disc blur from the frame.

			Colours stay in the RASTER's palette (yellow → orange → magenta), not the
			v2 palette: `.sun-regrade` re-hues this wash and the untouched rim with
			the same blend, so authoring here in the plate's own colours is what
			keeps the seam invisible.

			The one place this departs from the sampled ramp is the lower half,
			which is darkened well past the raster. `color` blending takes LUMINANCE
			from whatever is underneath, so the regrade cannot darken anything —
			this wash is the only thing that decides how the dome falls off toward
			the water, and the raster's near-flat ramp left the bottom as bright as
			the middle. That flatness is what made the bands read as brown smudges
			on orange rather than as crimson lines on a deepening disc.
		*/
		background: linear-gradient(
			to bottom,
			#fee429 0%,
			#fec816 10%,
			#ffa614 20%,
			#fd8b19 28%,
			#f4671f 36%,
			#e04a2e 44%,
			#c73842 52%,
			#ab2b4d 60%,
			#8c2154 70%,
			#741b58 80%,
			#63175a 90%,
			#5a155c 100%
		);
		/*
			Two mask layers, INTERSECTED. (1) A short vertical lead-in — transparent
			through 2%, opaque by 8% — leaves the raster's crisp specular cap alone;
			there is nothing to erase up there anyway. (2) The radial layer clamps
			the wash INSIDE the disc: the raster's edge wobbles a few px around the
			geometric rim, and an opaque wash poking past the paint would read as a
			hard orange arc on the sky. Feathering out over the last 3px lands the
			wash just inside the rim and lets the plate keep ownership of its own
			antialiased edge.
		*/
		-webkit-mask-image:
			linear-gradient(to bottom, transparent 0 2%, black 8% 100%),
			radial-gradient(circle closest-side, #000 calc(100% - 4px), transparent calc(100% - 1px));
		-webkit-mask-composite: source-in;
		mask-image:
			linear-gradient(to bottom, transparent 0 2%, black 8% 100%),
			radial-gradient(circle closest-side, #000 calc(100% - 4px), transparent calc(100% - 1px));
		mask-composite: intersect;
	}

	.restripe-lines {
		left: 50%;
		top: var(--disc-bottom);
		width: var(--disc-width);
		aspect-ratio: 1 / 1;
		/* Static node — GSAP never touches it, so translate centring is safe. */
		transform: translate(-50%, -100%);
		/*
			Hard stops in % of the disc box, so the rhythm scales with the width
			clamp instead of being pinned to one viewport. Read off the reference:
			the top 40% of the dome stays a clean yellow → orange gradient, then
			twelve lines run to the waterline with the gap CLOSING on the way down
			(7.4% → 3.3% of disc height) — that compression is what makes the disc
			read as curving away rather than as a flat striped circle. Each line is
			1% of the disc tall (~2px CSS, ~4px on a 2x shot), thin enough that the
			gradient still reads between them.
		*/
		--band-line: rgba(176, 18, 92, 0.66);
		background: linear-gradient(
			to bottom,
			transparent 0 40.5%,
			var(--band-line) 40.5% 41.5%,
			transparent 41.5% 47.9%,
			var(--band-line) 47.9% 48.9%,
			transparent 48.9% 54.8%,
			var(--band-line) 54.8% 55.8%,
			transparent 55.8% 61.2%,
			var(--band-line) 61.2% 62.2%,
			transparent 62.2% 67.1%,
			var(--band-line) 67.1% 68.1%,
			transparent 68.1% 72.5%,
			var(--band-line) 72.5% 73.5%,
			transparent 73.5% 77.4%,
			var(--band-line) 77.4% 78.4%,
			transparent 78.4% 81.9%,
			var(--band-line) 81.9% 82.9%,
			transparent 82.9% 86%,
			var(--band-line) 86% 87%,
			transparent 87% 89.8%,
			var(--band-line) 89.8% 90.8%,
			transparent 90.8% 93.3%,
			var(--band-line) 93.3% 94.3%,
			transparent 94.3% 96.6%,
			var(--band-line) 96.6% 97.6%,
			transparent 97.6% 100%
		);
		/*
			Same inset-circle clamp as the regrade: a line running to the geometric
			rim would otherwise leave a crimson stub on the sky wherever the raster
			disc falls short of the perfect circle.
		*/
		-webkit-mask-image: radial-gradient(
			circle closest-side,
			#000 calc(100% - 4px),
			transparent calc(100% - 1px)
		);
		mask-image: radial-gradient(
			circle closest-side,
			#000 calc(100% - 4px),
			transparent calc(100% - 1px)
		);
	}

	.sun-regrade {
		left: 50%;
		top: var(--disc-bottom);
		/*
			Exactly the measured disc: `discWidthFrac` x the plate, bottom edge on
			the same waterline anchor, centred on mid-frame. Static — GSAP never
			touches this node, so translate centring is safe here (unlike the halo).
		*/
		width: calc(var(--plate-width) * var(--disc-width-frac));
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		transform: translate(-50%, -100%);
		/*
			The v2 disc ramp: #ffd34f top, #ff7a2e mid, #d93a2b at the horizon.
			`color` blend = hue/saturation from this gradient, luminance from the
			plate — the baked bands survive as deep crimson (~#7a1030) instead of
			magenta-on-pink, and the disc keeps its own shading. The blend group is
			this layer's own stacking context, and the plate is opaque everywhere
			under this circle, so nothing behind the layer is touched.
		*/
		background: linear-gradient(to bottom, #ffd34f 0%, #ff7a2e 52%, #d93a2b 100%);
		mix-blend-mode: color;
		/*
			Feather the last ~3px so no hard colored arc can show where the overlay
			meets the plate disc's antialiased edge (closest-side puts 100% exactly
			on the inscribed-circle rim).
		*/
		-webkit-mask-image: radial-gradient(
			circle closest-side,
			#000 calc(100% - 3px),
			transparent 100%
		);
		mask-image: radial-gradient(circle closest-side, #000 calc(100% - 3px), transparent 100%);
	}

	.sun-halo {
		left: 50%;
		top: var(--disc-bottom);
		width: var(--halo-size);
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		/*
			Centred with negative margins rather than `translate`: GSAP reads the
			existing transform to pulse `scale`, and it resolves a -50% translate
			into a px offset once, which a viewport resize would then leave frozen
			off-centre. The anchor line is the disc's BOTTOM edge, so the vertical
			margin also lifts by half a disc — the disc is a circle, so that puts
			the halo's centre exactly on the disc's centre.
		*/
		margin-left: calc(-0.5 * var(--halo-size));
		margin-top: calc(-0.5 * var(--halo-size) - 0.5 * var(--disc-width));
		/*
			Warm core, restrained magenta fringe — glow, not floodlight. Alphas come
			from `SUN.halo`; the v1 values washed the disc out.
		*/
		background: radial-gradient(
			circle,
			rgba(var(--sunset-orange-rgb), var(--halo-orange-alpha)),
			rgba(var(--magenta-bright-rgb), var(--halo-magenta-alpha)) 45%,
			rgba(var(--magenta-bright-rgb), 0) 70%
		);
		filter: blur(var(--halo-blur));
		/*
			The blur is rasterised once and the compositor scales that texture; without
			the hint every frame of the pulse re-blurs a ~500px circle.
		*/
		will-change: transform;
	}

	@media (prefers-reduced-motion: reduce) {
		.sun-halo {
			/* No pulse attaches, so don't pay for a promoted layer. */
			will-change: auto;
		}
	}
</style>
