<!--
	The striped sun disc — the scene's focal point. The raster plate carries
	generous transparent margin around the disc, so every anchor here derives
	from the measured disc bounding box (`SUN.disc*Frac`): the translate
	percentages pin the DISC centre on an anchor line just above the horizon —
	so the disc reads as sinking through the floor, not resting on it — and
	centre the DISC (not the plate) on mid-frame. A frame-anchored mask on the
	clip wrapper cuts the disc dead at the horizon line, fading it out over the
	last few tens of px above it, and a soft glow band straddling the horizon
	swallows the clipped edge — so the disc dissolves into the horizon bloom
	instead of rendering as a sphere floating on the grid. The halo is a
	blurred radial div, not part of the raster asset, so it can pulse on its
	own without a second image.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		getSceneContext,
		SCENE_COLORS,
		SCENE_HORIZON_PCT,
		SUN,
		SUN_HALO_PULSE_SECONDS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources("sun");
	const fallback = assetFallback("sun");

	/*
		The disc is a circle, so its height equals its width; against the plate
		box that is `discWidthFrac * plateAspect` of the plate's height. From it
		derive the disc's centre line inside the plate.
	*/
	const discHeightFrac = SUN.discWidthFrac * SUN.plateAspect;
	const discCenterYFrac = SUN.discBottomFrac - discHeightFrac / 2;

	/*
		The disc centre anchors this far ABOVE the horizon line (% of frame
		height): high enough that the disc no longer floats on the grid, low
		enough that its clipped bottom still reaches the horizon and melts into
		the floor's bloom.
	*/
	const DISC_CENTER_LIFT_PCT = 5;
	const discCenterPct = SCENE_HORIZON_PCT - DISC_CENTER_LIFT_PCT;

	/*
		The disc fades to fully transparent AT the horizon, over this many px
		above it. The mask lives on the frame-spanning clip wrapper (not the
		img), so its stops resolve against frame height and the fade's end
		lands exactly on the grid's top edge at any viewport — disc-relative
		stops on the img cannot do that, and they are how the bottom curve
		used to leak ~50px onto the grid.
	*/
	const HORIZON_FADE_PX = 60;

	/*
		The glow band that swallows the clipped edge: a soft radial straddling
		the horizon, ~2x the disc's diameter wide. Its warm core is a touch
		redder than `sunsetOrangeRGB` — matched to the reference's horizon
		bloom, and local on purpose: it is this layer's blend color, not a
		scene-wide token.
	*/
	const GLOW_BAND_HEIGHT_PX = 120;
	const GLOW_BAND_RGB = "255, 120, 60";

	/*
		Geometry and palette flow in from scene-config as custom properties on the
		layer wrapper (never on `.sun-halo` itself — a reduced-motion test asserts
		the halo carries no inline style).
	*/
	const layerStyle = [
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		`--disc-center-y: ${discCenterPct}%`,
		`--plate-width: ${SUN.plateWidthCss}`,
		`--plate-aspect: ${SUN.plateAspect}`,
		`--halo-size: ${SUN.haloWidthCss}`,
		`--disc-width: ${SUN.discWidthCss}`,
		`--disc-center-x-frac: ${SUN.discCenterXFrac}`,
		`--disc-center-y-frac: ${discCenterYFrac}`,
		`--horizon-fade: ${HORIZON_FADE_PX}px`,
		`--glow-band-height: ${GLOW_BAND_HEIGHT_PX}px`,
		`--glow-band-rgb: ${GLOW_BAND_RGB}`,
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
	<div bind:this={haloEl} class="sun-halo absolute"></div>
	<picture class="sun-clip absolute inset-0">
		{#each sources as source (source.type)}
			<source type={source.type} srcset={source.srcset} sizes="min(45vw, 980px)" />
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
	<!-- After the picture in DOM order, so it draws over the disc's fading edge. -->
	<div class="horizon-glow absolute"></div>
</div>

<style>
	.sun-clip {
		/*
			Frame-anchored horizon clip: this wrapper spans the frame, so the
			gradient stops resolve against frame height and `var(--horizon)`
			lands exactly on the grid's top edge — the disc fades to nothing
			over the last `--horizon-fade` px above it and never paints below.
			The sun and grid layers share the same vertical parallax amplitude,
			so the clip line stays glued to the grid under pointer travel.
		*/
		-webkit-mask-image: linear-gradient(
			to bottom,
			black calc(var(--horizon) - var(--horizon-fade)),
			transparent var(--horizon)
		);
		mask-image: linear-gradient(
			to bottom,
			black calc(var(--horizon) - var(--horizon-fade)),
			transparent var(--horizon)
		);
	}

	.sun-image {
		left: 50%;
		top: var(--disc-center-y);
		width: var(--plate-width);
		height: auto;
		aspect-ratio: var(--plate-aspect);
		/*
			Translate percentages are of the element's own box: the y fraction puts
			the measured disc centre exactly on the anchor line, the x fraction
			centres the measured disc on mid-frame.
		*/
		transform: translate(
			calc(-100% * var(--disc-center-x-frac)),
			calc(-100% * var(--disc-center-y-frac))
		);
	}

	.horizon-glow {
		left: 50%;
		top: var(--horizon);
		width: calc(2 * var(--disc-width));
		height: var(--glow-band-height);
		/*
			Static translate (GSAP never touches this node), centring the band on
			the horizon so it straddles the clip line and swallows the disc's
			faded edge. `closest-side` pins the gradient's 100% to the band's own
			half-extents, so it reaches full transparency inside its box — no
			hard edge, no need to spread into the parallax bleed.
		*/
		transform: translate(-50%, -50%);
		background: radial-gradient(
			ellipse closest-side,
			rgba(var(--glow-band-rgb), 0.5),
			rgba(var(--glow-band-rgb), 0)
		);
	}

	.sun-halo {
		left: 50%;
		top: var(--disc-center-y);
		width: var(--halo-size);
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		/*
			Centred with negative margins rather than `translate`: GSAP reads the
			existing transform to pulse `scale`, and it resolves a -50% translate
			into a px offset once, which a viewport resize would then leave frozen
			off-centre. The anchor line is already the disc's centre, so both
			margins are a plain half-size.
		*/
		margin-left: calc(-0.5 * var(--halo-size));
		margin-top: calc(-0.5 * var(--halo-size));
		background: radial-gradient(
			circle,
			rgba(var(--sunset-orange-rgb), 0.5),
			rgba(var(--magenta-bright-rgb), 0.32) 45%,
			rgba(var(--magenta-bright-rgb), 0) 70%
		);
		filter: blur(44px);
		/*
			The blur is rasterised once and the compositor scales that texture; without
			the hint every frame of the pulse re-blurs a ~700px circle.
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
