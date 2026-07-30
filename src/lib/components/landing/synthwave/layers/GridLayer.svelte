<script lang="ts">
	import { gsap } from "gsap";
	import { getSceneContext, GRID_SCROLL_SECONDS } from "../scene-config.js";

	/**
	 * Grid cell, in the plane's own (un-projected) pixels. Injected into the CSS as
	 * `--cell` so this constant is the single source of truth: the pattern repeats
	 * every cell, and the scroll tween travels exactly one cell, which is what
	 * makes the loop seamless.
	 */
	const CELL = 60;

	const scene = getSceneContext();

	let scrollEl: HTMLDivElement;

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: the grid holds its static pose

		// `gsap.to` rather than `tl.to`, because a timeline's `.to()` returns the
		// timeline itself — killing that on cleanup would take the whole scene down.
		const tween = gsap.to(scrollEl, {
			y: CELL,
			duration: GRID_SCROLL_SECONDS,
			repeat: -1,
			ease: "none",
		});
		tl.add(tween, 0);

		return () => {
			tween.kill();
			gsap.set(scrollEl, { y: 0 });
		};
	});
</script>

<!--
	The floor: one CSS 3D plane, no canvas and no per-line DOM.

	Geometry (all depths below are plane-local px, measured from the plane's
	rotation axis, positive = toward the viewer):

	- The viewport box starts at the horizon (52%) and runs to the bottom. Its
	  `perspective` is 640px with the eye centred on its top edge, so the eye
	  plane — where a 3D transform blows up — sits at 640 / sin(82deg) = 646px.
	- The plane is tilted `rotateX(82deg)` about an axis placed 160px *below* the
	  horizon line. Putting the axis below the horizon is what buys the classic
	  look: the plane keeps going past the axis into negative depth, where the
	  projection *compresses* it (magnification 0.41 at the plane's far edge)
	  instead of only ever magnifying it. Cells therefore fan from ~25px wide at
	  the horizon to ~145px at the bottom — a 9x spread — and ~23 rows land on
	  the floor, ten of them below the mask fade.
	- That 0.41 compression is also why the plane is 300% wide: covering the
	  screen at the horizon needs 1 / 0.41 = 2.45 screens of local width.
	- The scrolling wrapper's deepest edge reaches 590px, comfortably inside the
	  646px eye plane, so no part of it ever crosses it at any point of the loop.

	Only `transform` animates, and only on the scroll wrapper. Everything else —
	the bloom baked into the gradients, the horizon glow — is static, so there is
	no CSS animation to switch off under reduced motion: the tween simply never
	attaches and the plane renders its rest pose.
-->
<div class="floor absolute inset-0" style={`--cell: ${CELL}px;`}>
	<!-- Unmasked base, so the top of the floor stays opaque where the lines fade out. -->
	<div class="floor-base"></div>

	<div class="grid-viewport">
		<div class="grid-plane">
			<div bind:this={scrollEl} class="grid-scroll"></div>
		</div>
	</div>

	<!-- Bloom first, then the crisp line on top of it. Both static. -->
	<div class="horizon-bloom"></div>
	<div class="horizon-line"></div>
</div>

<style>
	.floor {
		/* Top of the grid area. Every child below is anchored to it. */
		--horizon: 52%;
		--persp: 640px;
		--tilt: 82deg;
		/* Depth of the rotation axis below the horizon line, in screen px. */
		--axis: 160px;
		/* Plane extent above / below the axis, in plane-local px. */
		--far: 940px;
		--near: 530px;
		--line: 255, 45, 120;
		--column: 191, 95, 255;
	}

	/*
		The floor is opaque and reaches the frame edges, so it spreads into the
		scene's parallax bleed on the three sides that can be exposed — without it,
		pointer parallax slides a hard-edged near-black box off the frame and shows a
		strip of bare sky down the side. The bleed is symmetric, so the vanishing
		point stays on the frame's centre line and none of the geometry below moves.
	*/
	.floor-base {
		position: absolute;
		top: var(--horizon);
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		bottom: calc(-1 * var(--parallax-bleed-y, 0px));
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		background: linear-gradient(to bottom, #0d0418, #0a0015);
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
		left: -100%;
		width: 300%;
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
			neighbouring tiles join into a single ~2px core with a soft falloff on
			both sides — bloom for free, without a filter or a second element.
		*/
		background-image:
			linear-gradient(
				to bottom,
				rgba(var(--line), 0.95) 0,
				rgba(var(--line), 0.95) 1px,
				rgba(var(--line), 0.22) 4px,
				rgba(var(--line), 0) 9px,
				rgba(var(--line), 0) calc(var(--cell) - 9px),
				rgba(var(--line), 0.22) calc(var(--cell) - 4px),
				rgba(var(--line), 0.95) calc(var(--cell) - 1px),
				rgba(var(--line), 0.95) var(--cell)
			),
			linear-gradient(
				to right,
				rgba(var(--column), 0.7) 0,
				rgba(var(--column), 0.7) 1px,
				rgba(var(--column), 0.18) 4px,
				rgba(var(--column), 0) 9px,
				rgba(var(--column), 0) calc(var(--cell) - 9px),
				rgba(var(--column), 0.18) calc(var(--cell) - 4px),
				rgba(var(--column), 0.7) calc(var(--cell) - 1px),
				rgba(var(--column), 0.7) var(--cell)
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

	.horizon-bloom {
		position: absolute;
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		top: calc(var(--horizon) - 7px);
		height: 16px;
		background: radial-gradient(
			ellipse 55% 100% at 50% 50%,
			rgba(var(--line), 0.5),
			rgba(var(--line), 0) 75%
		);
		filter: blur(5px);
	}

	.horizon-line {
		position: absolute;
		left: calc(-1 * var(--parallax-bleed-x, 0px));
		right: calc(-1 * var(--parallax-bleed-x, 0px));
		top: calc(var(--horizon) - 1px);
		height: 2px;
		background: linear-gradient(
			to right,
			rgba(var(--line), 0) 0%,
			rgba(var(--line), 0.85) 22%,
			rgba(255, 214, 236, 0.95) 50%,
			rgba(var(--line), 0.85) 78%,
			rgba(var(--line), 0) 100%
		);
	}
</style>
