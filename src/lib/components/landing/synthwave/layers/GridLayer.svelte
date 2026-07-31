<script lang="ts">
	import { gsap } from "gsap";
	import {
		getSceneContext,
		GRID,
		GRID_SCROLL_SECONDS,
		SCENE_COLORS,
		SCENE_HORIZON_PCT,
	} from "../scene-config.js";

	const scene = getSceneContext();

	let scrollEl: HTMLDivElement;

	/**
	 * Every number the stylesheet needs, injected from scene-config so the CSS
	 * never carries its own copy. `--cell` doubles as the tween distance: the
	 * pattern repeats every cell and the scroll travels exactly one cell per
	 * loop, which is what makes the loop seamless.
	 */
	const styleVars = [
		`--horizon: ${SCENE_HORIZON_PCT}%`,
		`--cell: ${GRID.cellPx}px`,
		`--persp: ${GRID.perspectivePx}px`,
		`--tilt: ${GRID.tiltDeg}deg`,
		`--axis: ${GRID.axisBelowHorizonPx}px`,
		`--far: ${GRID.farPx}px`,
		`--near: ${GRID.nearPx}px`,
		`--plane-width: ${GRID.planeWidthPct}%`,
		`--line: ${GRID.lineRGB}`,
		`--line-alpha: ${GRID.lineAlpha}`,
		`--column: ${GRID.columnRGB}`,
		`--column-alpha: ${GRID.columnAlpha}`,
		`--floor: ${SCENE_COLORS.nightFloor}`,
		`--base-fade: ${GRID.baseFadeInPx}px`,
		`--bloom-width: ${GRID.bloomWidthPct}%`,
		`--bloom-height: ${GRID.bloomHeightPx}px`,
		`--bloom-blur: ${GRID.bloomBlurPx}px`,
		`--bloom-alpha: ${GRID.bloomAlpha}`,
		`--hot: ${SCENE_COLORS.horizonHotRGB}`,
	].join("; ");

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: the grid holds its static pose

		// `gsap.to` rather than `tl.to`, because a timeline's `.to()` returns the
		// timeline itself — killing that on cleanup would take the whole scene down.
		const tween = gsap.to(scrollEl, {
			y: GRID.cellPx,
			duration: GRID_SCROLL_SECONDS,
			repeat: -1,
			ease: "none",
		});
		tl.add(tween, 0);

		return () => {
			tween.kill();
			gsap.set(scrollEl, { clearProps: "transform" });
		};
	});
</script>

<!--
	The floor: one CSS 3D plane, no canvas and no per-line DOM.

	Geometry (all depths below are plane-local px, measured from the plane's
	rotation axis, positive = toward the viewer):

	- The viewport box starts at the horizon (57.4%) and runs to the bottom. Its
	  `perspective` is 640px with the eye centred on its top edge, so the eye
	  plane — where a 3D transform blows up — sits at 640 / sin(82deg) ≈ 646px.
	- The plane is tilted `rotateX(82deg)` about an axis placed 160px *below* the
	  horizon line. Putting the axis below the horizon is what buys the classic
	  look: the plane keeps going past the axis into negative depth, where the
	  projection *compresses* it (magnification ≈ 0.29 at the plane's far edge,
	  1560px out) instead of only ever magnifying it. The 260px cells therefore
	  fan from slivers at the horizon to roughly double width at the bottom —
	  the coarse floor of the mock, a handful of fat cells instead of a mesh.
	- That far-edge compression is also why the plane is 300% wide: covering the
	  frame near the horizon takes ~3 screens of local width, and whatever gap
	  remains at the extreme far end sits entirely under the viewport's top-edge
	  mask fade.
	- Safety check: the scroll wrapper's deepest painted point is `near` + one
	  cell of tween travel = 340 + 260 = 600 < 646, so no part of it can ever
	  cross the eye plane at any point of the loop.

	Only `transform` animates, and only on the scroll wrapper. Everything else —
	the floor-base fade, the horizon bloom, the hot line — is static, so there is
	no CSS animation to switch off under reduced motion: the tween simply never
	attaches and the plane renders its rest pose.
-->
<div class="floor absolute inset-0" style={styleVars}>
	<!--
		The floor base is transparent AT the horizon and only reaches opaque
		`nightFloor` by `--base-fade` below it, so the sun disc's sunken slice
		glows through the floor's top edge — the "melt" of the mock, and the fix
		for the old opaque pink bar.
	-->
	<div class="floor-base"></div>

	<div class="grid-viewport">
		<div class="grid-plane">
			<div bind:this={scrollEl} class="grid-scroll"></div>
		</div>
	</div>

	<!-- Wide soft bloom first, then the thin hot line on top of it. Both static. -->
	<div class="horizon-bloom"></div>
	<div class="horizon-line"></div>
</div>

<style>
	/*
		The floor base reaches the frame edges, so it spreads into the scene's
		parallax bleed on the three sides that can be exposed — without it, pointer
		parallax slides a hard-edged near-black box off the frame and shows a strip
		of bare sky down the side. The bleed is symmetric, so the vanishing point
		stays on the frame's centre line and none of the geometry below moves.
	*/
	.floor-base {
		position: absolute;
		top: var(--horizon);
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		bottom: calc(-1 * var(--parallax-bleed-y, 0px));
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		background: linear-gradient(to bottom, transparent 0, var(--floor) var(--base-fade));
	}

	.grid-viewport {
		position: absolute;
		top: var(--horizon);
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		bottom: calc(-1 * var(--parallax-bleed-y, 0px));
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		overflow: hidden;
		perspective: var(--persp);
		perspective-origin: 50% 0;
		/* Lines dissolve into the horizon instead of being cut off by the box edge. */
		mask-image: linear-gradient(to bottom, transparent 0, black 18%, black 100%);
	}

	.grid-plane {
		position: absolute;
		top: calc(var(--axis) - var(--far));
		left: calc((100% - var(--plane-width)) / 2);
		width: var(--plane-width);
		height: calc(var(--far) + var(--near));
		transform-origin: 50% var(--far);
		transform: rotateX(var(--tilt));
	}

	/*
		Carries the pattern and is the only animated node. It overhangs the plane by
		two cells at the far end so that after travelling one cell there is still
		pattern above the horizon, and stops flush with the plane at the near end so
		the tween can never push it through the eye plane.
	*/
	.grid-scroll {
		position: absolute;
		top: calc(-2 * var(--cell));
		bottom: 0;
		left: 0;
		right: 0;
		will-change: transform;
		/*
			One tile per axis. Each tile carries half of a line core at either end, so
			neighbouring tiles join into a single ~2px core with a soft ~10px falloff
			on both sides — bloom for free, without a filter or a second element. Core
			and falloff alphas both derive from the config alpha, rows brighter than
			columns.
		*/
		background-image:
			linear-gradient(
				to bottom,
				rgba(var(--line), var(--line-alpha)) 0,
				rgba(var(--line), var(--line-alpha)) 1px,
				rgba(var(--line), calc(var(--line-alpha) * 0.28)) 5px,
				rgba(var(--line), 0) 10px,
				rgba(var(--line), 0) calc(var(--cell) - 10px),
				rgba(var(--line), calc(var(--line-alpha) * 0.28)) calc(var(--cell) - 5px),
				rgba(var(--line), var(--line-alpha)) calc(var(--cell) - 1px),
				rgba(var(--line), var(--line-alpha)) var(--cell)
			),
			linear-gradient(
				to right,
				rgba(var(--column), var(--column-alpha)) 0,
				rgba(var(--column), var(--column-alpha)) 1px,
				rgba(var(--column), calc(var(--column-alpha) * 0.24)) 5px,
				rgba(var(--column), 0) 10px,
				rgba(var(--column), 0) calc(var(--cell) - 10px),
				rgba(var(--column), calc(var(--column-alpha) * 0.24)) calc(var(--cell) - 5px),
				rgba(var(--column), var(--column-alpha)) calc(var(--cell) - 1px),
				rgba(var(--column), var(--column-alpha)) var(--cell)
			);
		background-size:
			100% var(--cell),
			var(--cell) 100%;
		/* Columns are centred so the fan stays symmetrical about the vanishing point. */
		background-position:
			left top,
			center top;
		background-repeat: repeat-y, repeat-x;
	}

	@media (prefers-reduced-motion: reduce) {
		.grid-scroll {
			/* The scroll tween never attaches, so don't promote this for nothing. */
			will-change: auto;
		}
	}

	/*
		One wide, soft ellipse straddling the horizon — luminous haze, NOT a hard
		bar. It fades out well inside the frame edges, so it needs no bleed spread.
	*/
	.horizon-bloom {
		position: absolute;
		left: calc((100% - var(--bloom-width)) / 2);
		width: var(--bloom-width);
		top: calc(var(--horizon) - var(--bloom-height) / 2);
		height: var(--bloom-height);
		background: radial-gradient(
			ellipse 50% 50% at 50% 50%,
			rgba(var(--line), var(--bloom-alpha)),
			rgba(var(--line), 0) 70%
		);
		filter: blur(var(--bloom-blur));
	}

	/* The thin hot line, subtle and fully transparent by 18% / 82% of the width. */
	.horizon-line {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(var(--horizon) - 1px);
		height: 2px;
		background: linear-gradient(
			to right,
			rgba(var(--line), 0) 18%,
			rgba(var(--line), 0.75) 34%,
			rgba(var(--hot), 0.9) 50%,
			rgba(var(--line), 0.75) 66%,
			rgba(var(--line), 0) 82%
		);
	}
</style>
