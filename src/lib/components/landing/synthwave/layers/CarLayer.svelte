<!--
	Rear 3/4 hero car — the dominant right-foreground element, parked on the
	open grid above and left of the footer's link columns. A small, heavily
	blurred radial div behind it stands in for the tail-light glow (no second
	image); its resting state is fully lit for the reduced-motion / no-JS case,
	and the scene timeline dims it down to breathe between 0.75 and 1 opacity.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		CAR,
		CAR_GLOW_MIN_OPACITY,
		CAR_GLOW_PULSE_SECONDS,
		getSceneContext,
		SCENE_COLORS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const sources = assetSources(CAR.asset);
	const fallback = assetFallback(CAR.asset);

	/*
		Visual-judging overrides on top of the CAR config (scene-config is
		read-only to this layer). Round one found the 22vw car reading as a toy;
		round two found the 1.6x car still dim and buried behind the footer's
		right link column. So the plate now scales 2.16x (1.6 x a further 1.35)
		— visible body ≈ 32% of frame width — and re-anchors up and to the left:
		the body's right edge stops ≈ 80px short of the rightmost footer
		column's heading (at ~73% of frame width on the judged 1440px viewport),
		and the wheel line rides just above the footer heading row, so the car
		stands on open grid as the dominant right-foreground element like the
		reference mock, instead of sinking behind the link text.

		The plate carries transparent margin around the body. Measured from the
		1280x853 plate's alpha bounding box: body right edge at 89.7% of plate
		width, wheels at 70.3% of plate height. The anchors below subtract those
		margins so the BODY (not the plate) lands BODY_RIGHT_PCT from the right
		edge with its wheels WHEELS_BOTTOM_PCT up from the bottom.
	*/
	const CAR_SCALE = 2.16;
	/** Visible body's right edge, % of frame width in from the right edge. */
	const BODY_RIGHT_PCT = 32.5;
	/** Wheel line, % of frame height up from the bottom edge. */
	const WHEELS_BOTTOM_PCT = 24;
	/** Transparent margin right of the body, as a fraction of plate width. */
	const PLATE_MARGIN_RIGHT = 0.103; // 1 - 0.897
	/** Transparent margin below the wheels, as a fraction of plate WIDTH. */
	const PLATE_MARGIN_BELOW = 0.198; // (1 - 0.703) / (1280 / 853)

	/* Geometry and glow tint flow from scene-config; the CSS below only consumes. */
	const carVars = [
		`--car-width: calc(${CAR.widthCss} * ${CAR_SCALE})`,
		`--car-right: calc(${BODY_RIGHT_PCT}% - ${PLATE_MARGIN_RIGHT} * var(--car-width))`,
		`--car-bottom: calc(${WHEELS_BOTTOM_PCT}% - ${PLATE_MARGIN_BELOW} * var(--car-width))`,
		`--car-aspect: ${CAR.aspect}`,
		`--glow-mid-rgb: ${SCENE_COLORS.magentaBrightRGB}`,
	].join("; ");

	let glowEl: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: glow holds its static, fully-lit pose

		// A standalone `gsap.fromTo` added to the master, never `tl.set` + `tl.to`:
		// a timeline's `.to()` returns the timeline, so killing its result would take
		// the whole scene down with it.
		const tween = gsap.fromTo(
			glowEl,
			{ opacity: CAR_GLOW_MIN_OPACITY },
			{
				opacity: 1,
				yoyo: true,
				repeat: -1,
				duration: CAR_GLOW_PULSE_SECONDS,
				ease: "sine.inOut",
			}
		);
		tl.add(tween, 0);

		return () => {
			tween.kill();
			// Back to the CSS rest state: fully lit.
			gsap.set(glowEl, { clearProps: "opacity" });
		};
	});
</script>

<div class="absolute inset-0" style={carVars}>
	<div class="car-pos">
		<div bind:this={glowEl} class="tail-glow"></div>
		<picture>
			{#each sources as source (source.type)}
				<!-- The base 22vw/440px slot from CAR.widthCss, scaled by CAR_SCALE. -->
				<source type={source.type} srcset={source.srcset} sizes="min(47.5vw, 950px)" />
			{/each}
			<img src={fallback} alt="" loading="lazy" decoding="async" draggable="false" />
		</picture>
	</div>
</div>

<style>
	.car-pos {
		position: absolute;
		/*
			Right/bottom anchor the visible body (margin-compensated, see the
			constants above): body right edge 32.5% in from the frame's right
			edge — clear of the footer's rightmost column — with the wheel line
			24% of frame height above the bottom, just over the footer heading
			row. Up here the car stands on open grid, above the footer scrim's
			darkest band, dominating the right foreground like the mock.
		*/
		right: var(--car-right);
		bottom: var(--car-bottom);
		width: var(--car-width);
	}

	.car-pos img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: var(--car-aspect);
		/*
			Full strength — the bottom vignette and footer scrim were reading
			the car as dimmed, so nothing here may soften it further.
		*/
		opacity: 1;
		/*
			Static tail-light bloom re-emitted from the car's own alpha
			silhouette; hottest where the body abuts the lit tail-glow div. A
			static filter — only the glow div's opacity ever animates.
		*/
		filter: drop-shadow(0 0 24px rgba(255, 60, 20, 0.8));
	}

	.tail-glow {
		position: absolute;
		left: 32%;
		bottom: 20%;
		width: 22%;
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		opacity: 1;
		background: radial-gradient(
			circle,
			rgba(255, 80, 40, 0.85),
			rgba(var(--glow-mid-rgb), 0.4) 55%,
			rgba(var(--glow-mid-rgb), 0) 75%
		);
		/*
			Static blur shapes the glow disc; the drop-shadow re-emits it as a
			wider halo so the tail lights punch at the bigger car size. Both are
			static filters — only opacity ever animates.
		*/
		filter: blur(18px) drop-shadow(0 0 28px rgba(255, 70, 40, 0.85));
		/* Keeps the breath on the compositor instead of re-blurring every frame. */
		will-change: opacity;
	}

	@media (prefers-reduced-motion: reduce) {
		.tail-glow {
			/* No breath attaches, so don't pay for a promoted layer. */
			will-change: auto;
		}
	}
</style>
